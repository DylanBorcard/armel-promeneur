/* Prototype du site d'Armel Promeneur — JavaScript sans framework.
   Routage par hash (#/galerie, #/oeuvre/07…), marche aussi ouvert en file://.
   Les données viennent de data.js (window.SITE). Rien n'est envoyé sur internet. */
(function () {
  'use strict';

  var SITE = window.SITE;
  var LISTE = SITE.oeuvres;
  var TOTAL = LISTE.length;
  var NOM = SITE.artiste;
  var INSTA = SITE.instagram;
  var PAR_N = {};
  LISTE.forEach(function (o) { PAR_N[o.n] = o; });
  var CATS = SITE.categories;
  var CAT = {};
  CATS.forEach(function (c) { CAT[c.id] = c; });

  // Ordre de la grille : celui de la maquette (les techniques mélangées)
  var ORDRE_GRILLE = ['07', '02', '17', '22', '05', '13', '18', '24', '10', '01', '15', '08',
    '21', '09', '03', '19', '12', '20', '06', '11', '23', '14', '04', '16'];

  // Accords grammaticaux par catégorie
  var CAT_PLUS = {
    peintures: { tous: 'Toutes les peintures', detail: 'de la peinture' },
    collages: { tous: 'Tous les collages', detail: 'du collage' },
    sculptures: { tous: 'Toutes les sculptures', detail: 'de la sculpture' },
    dessins: { tous: 'Tous les dessins', detail: 'du dessin' }
  };

  var main = document.getElementById('contenu');
  var pied = document.getElementById('pied');
  var mouvementReduit = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Petits outils ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function deux(n) { return String(n).padStart(2, '0'); }
  // Prix au format suisse : CHF 1'800.–
  function chf(v) { return 'CHF ' + String(v).replace(/\B(?=(\d{3})+(?!\d))/g, "'") + '.–'; }
  var EX = ' <span class="ex">exemple</span>'; // espace devant : « CHF 1'800.– exemple » aussi pour les lecteurs d'écran
  function dispo(o) { return o.statut === 'disponible'; }
  function ratio(o) { return o.w / o.h; }
  function vignette(o) { return 'img/oeuvre-' + o.n + '-720.jpg'; }
  function grande(o) { return 'img/oeuvre-' + o.n + '.jpg'; }
  function alt(o) { return 'Armel Promeneur, N° ' + o.n + ', ' + o.type.toLowerCase().replace(' · ', ', '); }
  function prixCourt(o) { return dispo(o) ? chf(o.prix) + EX : '<span aria-hidden="true">●</span> Vendue' + EX; }
  function statut(o) { return (dispo(o) ? 'Disponible' : 'Vendue') + EX; }
  function rang(o) { return LISTE.indexOf(o); }
  function voisin(o, d) { return LISTE[(rang(o) + d + TOTAL) % TOTAL]; }
  function lienOeuvre(o) { return '#/oeuvre/' + o.n; }
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------- Cartes et rangées justifiées ---------- */
  function carte(o, opts) {
    opts = opts || {};
    var r = ratio(o);
    var style = opts.flex ? ' style="flex:' + (r * 100).toFixed(2) + ' 1 ' + (r * 250).toFixed(1) + 'px"' : '';
    var prix = opts.prix ? '<span class="carte-prix">' + prixCourt(o) + '</span>' : '';
    return '<a class="carte" href="' + lienOeuvre(o) + '"' + style + '>' +
      '<span class="carte-hd mono"><span>N° ' + o.n + '</span><span class="c2">' + esc(o.type) + '</span></span>' +
      '<img src="' + vignette(o) + '" alt="' + esc(alt(o)) + '" width="' + o.w + '" height="' + o.h + '" loading="lazy" decoding="async" style="aspect-ratio:' + o.w + ' / ' + o.h + '">' +
      '<span class="carte-lg"><span class="ph">[Titre, année]</span>' + prix + '</span></a>';
  }

  // Blocs justifiés de la page en cours (recalculés au redimensionnement)
  var blocs = [];
  function justifier(el, items, nPour, opts) {
    if (!el) return;
    var b = { el: el, items: items, nPour: nPour, opts: opts || {}, n: -1 };
    blocs.push(b);
    dessinerBloc(b);
  }
  function dessinerBloc(b) {
    var n = b.nPour(b.el.clientWidth);
    if (n === b.n) return;
    b.n = n;
    if (n === 0) { // défilement de côté (téléphone)
      b.el.innerHTML = '<div class="defile">' + b.items.map(function (o) { return carte(o, b.opts); }).join('') + '</div>';
      return;
    }
    // Galerie sur téléphone (une œuvre par rangée) : les 4 premières, puis « Afficher les N suivantes ↓ » (canevas)
    var items = b.items;
    var reste = 0;
    if (b.opts.replier && n === 1 && !galerieDepliee && items.length - 4 >= 2) {
      reste = items.length - 4;
      items = items.slice(0, 4);
    }
    var moy = items.reduce(function (s, o) { return s + ratio(o); }, 0) / (items.length || 1);
    var html = '';
    for (var i = 0; i < items.length; i += n) {
      var groupe = items.slice(i, i + n);
      html += '<div class="rang">' + groupe.map(function (o) {
        return carte(o, { flex: true, prix: b.opts.prix });
      }).join('');
      var manque = n - groupe.length;
      if (manque > 0) { // (facteurs ×100 : une somme < 1 ne remplirait pas la rangée) place vide invisible : les images de la dernière rangée ne grossissent pas
        var g = moy * manque;
        html += '<span class="rang-vide" aria-hidden="true" style="flex:' + (g * 100).toFixed(2) + ' 1 ' + (g * 250 + (manque - 1) * 24).toFixed(1) + 'px"></span>';
      }
      html += '</div>';
    }
    if (reste) html += '<button type="button" class="btn-plus" data-plus>Afficher les ' + reste + ' suivantes <span aria-hidden="true">↓</span></button>';
    b.el.innerHTML = html;
    var plus = $('[data-plus]', b.el);
    if (plus) plus.addEventListener('click', function () {
      galerieDepliee = true;
      b.n = -1;
      dessinerBloc(b);
      var c5 = $$('a.carte', b.el)[4];
      if (c5) c5.focus({ preventScroll: true });
    });
  }
  var galerieDepliee = false; // retenu pendant la visite (retour depuis une fiche : la liste reste dépliée)
  function nGalerie(w) { return w >= 1100 ? 4 : w >= 820 ? 3 : w >= 560 ? 2 : 1; }
  function nChoisies(w) { return w >= 760 ? 4 : w >= 560 ? 2 : 1; }
  function nAutres(w) { return w >= 640 ? 4 : 0; }

  /* ---------- Pied de page ---------- */
  function piedHtml(variante) {
    var contact = variante === 'contact';
    var acc = contact
      ? 'Les œuvres, <span class="nw">en grand et entières&#8239;:</span> <a href="#/galerie">la galerie</a>.'
      : 'Une œuvre vous intéresse&#8239;? <span class="nw">Écrivez à Armel.</span>';
    var premier = contact
      ? '<a class="ft-it" href="#/galerie"><span class="ft-lab">Galerie</span><span class="ft-val">24 œuvres →</span></a>'
      : '<a class="ft-it" href="#/contact"><span class="ft-lab">Contact</span><span class="ft-val">Formulaire →</span></a>';
    return '<div class="ft-haut"><p class="ft-acc">' + acc + '</p>' + premier +
      '<a class="ft-it large" href="' + INSTA + '" target="_blank" rel="noopener"><span class="ft-lab">Instagram</span><span class="ft-val">@promeneur_armel_studio ↗</span></a>' +
      '<div class="ft-it"><span class="ft-lab">Lieu</span><span class="ft-val">En Suisse, <span class="ph">[ville]</span></span></div></div>' +
      '<div class="ft-bas mono"><span>Armel Promeneur © 2026</span><span><a href="#/impressum">Impressum</a> · <a href="#/impressum/protection-donnees"><span class="d-only">Protection des données</span><span class="m-only">Données</span></a></span></div>';
  }

  /* ---------- Page : accueil ---------- */
  var heros = null; // œuvre affichée dans le héros

  function pageAccueil() {
    var o = PAR_N[SITE.phare] || LISTE[0];
    heros = o;
    var choisies = SITE.choisies.map(function (n) { return PAR_N[n]; }).filter(Boolean);
    var html =
      '<section class="hero" aria-label="Œuvre à la une"><div class="hero-in">' +
        '<div class="hero-g">' +
          '<h1 class="hero-h1" tabindex="-1"><span class="hero-nom">Armel Promeneur</span><span class="hero-sous">Peintre et sculpteur</span></h1>' +
          '<nav class="hero-nav" aria-label="Navigation principale">' +
            '<a href="#/galerie"><span class="mono">01</span><span class="t">Galerie</span></a>' +
            '<a href="#/a-propos"><span class="mono">02</span><span class="t">À propos</span></a>' +
            '<a href="#/contact"><span class="mono">03</span><span class="t">Contact</span></a>' +
            '<a href="' + INSTA + '" target="_blank" rel="noopener"><span class="mono" aria-hidden="true">↗</span><span class="t">Instagram</span></a>' +
          '</nav>' +
        '</div>' +
        '<div class="hero-c">' +
          '<figure class="hero-fig">' +
            '<a href="' + lienOeuvre(o) + '" data-h="lien"><img data-h="img" src="' + grande(o) + '" alt="' + esc(alt(o)) + '" width="' + o.w + '" height="' + o.h + '" fetchpriority="high" style="--r:' + ratio(o).toFixed(4) + '"></a>' +
            '<figcaption class="mono hero-vert" data-h="vert">Armel Promeneur · N° ' + o.n + ' · ' + esc(o.type) + '</figcaption>' +
          '</figure>' +
        '</div>' +
        '<div class="hero-d">' +
          '<a class="hero-index" href="#/galerie?vue=index">Index des œuvres (' + TOTAL + ')</a>' +
          '<div class="cartel">' +
            '<p class="mono cart-num" aria-live="polite"><span data-h="num">N° ' + o.n + '</span><span class="c2" data-h="pos"></span></p>' +
            '<p class="cart-titre"><span class="ph">[Titre à fournir]</span></p>' +
            '<p class="cart-type"><span data-h="type"></span> · <span class="ph">[année]</span></p>' +
            '<p class="cart-statut" data-h="statut"></p>' +
            '<div class="cart-nav">' +
              '<button type="button" class="rond" data-h="prec">←</button>' +
              '<button type="button" class="rond" data-h="suiv">→</button>' +
              '<a class="cart-voir" data-h="voir" href="' + lienOeuvre(o) + '"><span>Voir l\'œuvre →</span></a>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="cartel-m">' +
          '<p class="mono cart-num" aria-live="polite"><span><span data-h="num"></span> · <span data-h="type"></span></span><span class="c2" data-h="pos"></span></p>' +
          '<p class="cart-titre-m"><span class="ph">[Titre à fournir]</span> <span class="an"><span class="ph">[année]</span></span></p>' +
          '<p class="cart-statut" data-h="statut"></p>' +
          '<div class="cart-nav">' +
            '<button type="button" class="rond" data-h="prec">←</button>' +
            '<button type="button" class="rond" data-h="suiv">→</button>' +
            '<a class="cart-voir" data-h="voir" href="' + lienOeuvre(o) + '"><span>Voir l\'œuvre →</span></a>' +
          '</div>' +
        '</div>' +
      '</div></section>' +

      '<section class="pres" aria-labelledby="presentation">' +
        '<p class="mono pres-k" id="presentation">01 — Présentation</p>' +
        '<div class="pres-c">' +
          '<h2>Des visages au trait noir, <span class="nw">la couleur</span> posée en collage, <span class="nw">le bois</span> des souches.</h2>' +
          '<p class="pres-acc"><span class="ph">[accroche provisoire, à valider avec Armel]</span></p>' +
          '<p class="pres-txt"><span class="ph d-only">[Deux ou trois phrases de présentation, à écrire avec Armel : son parcours, ses techniques, ce qui le guide.]</span><span class="ph m-only">[Deux ou trois phrases de présentation, à écrire avec Armel.]</span></p>' +
          '<dl class="faits">' +
            '<div><dt class="mono">Pratique</dt><dd>Peinture, collage, sculpture, dessin</dd></div>' +
            '<div><dt class="mono">Origine</dt><dd>Guadeloupe</dd></div>' +
            '<div><dt class="mono">Vit et travaille</dt><dd>En Suisse, <span class="ph">[ville]</span></dd></div>' +
            '<div><dt class="mono">Expositions</dt><dd>Pop-up Pepeuf, Markthalle Basel, juin 2026</dd></div>' +
          '</dl>' +
        '</div>' +
      '</section>' +

      '<section class="sel" aria-labelledby="selection">' +
        '<div class="sec-hd"><h2 id="selection">Œuvres choisies</h2>' +
          '<div class="sec-hd-r"><span class="mono d-only">' + choisies.length + ' œuvres sur ' + TOTAL + '</span><span class="mono m-only">' + choisies.length + ' sur ' + TOTAL + '</span>' +
          '<a class="lien-s d-only" href="#/galerie">Toute la galerie →</a></div></div>' +
        '<div class="justif serre" id="choisies"></div>' +
        '<a class="btn-gal m-only" href="#/galerie">Toute la galerie (' + TOTAL + ') <span aria-hidden="true">→</span></a>' +
      '</section>';

    return {
      html: html, titre: 'Armel Promeneur — Peintre et sculpteur', nav: '', pied: 'defaut',
      apres: function () {
        justifier($('#choisies'), choisies, nChoisies);
        majHeros(o, false);
        $$('[data-h="prec"]', main).forEach(function (b) { b.addEventListener('click', function () { majHeros(voisin(heros, -1), true); }); });
        $$('[data-h="suiv"]', main).forEach(function (b) { b.addEventListener('click', function () { majHeros(voisin(heros, 1), true); }); });
      }
    };
  }

  // Change l'œuvre du héros (fondu doux, sauf mouvements réduits)
  var jetonHeros = 0;
  function majHeros(o, anim) {
    heros = o;
    var fig = $('.hero-fig', main);
    if (!fig) return;
    var p = voisin(o, -1), s = voisin(o, 1);
    function texte(cle, val) { $$('[data-h="' + cle + '"]', main).forEach(function (e) { e.innerHTML = val; }); }
    texte('num', 'N° ' + o.n);
    texte('pos', o.n + ' / ' + TOTAL);
    texte('type', esc(o.type));
    texte('statut', statut(o));
    $$('[data-h="prec"]', main).forEach(function (b) { b.setAttribute('aria-label', 'Œuvre précédente, N° ' + p.n); });
    $$('[data-h="suiv"]', main).forEach(function (b) { b.setAttribute('aria-label', 'Œuvre suivante, N° ' + s.n); });
    $$('[data-h="voir"], [data-h="lien"]', main).forEach(function (a) { a.href = lienOeuvre(o); });
    var img = $('[data-h="img"]', fig);
    var vert = $('[data-h="vert"]', fig);
    function poser() {
      img.src = grande(o); img.alt = alt(o); img.width = o.w; img.height = o.h;
      img.style.setProperty('--r', ratio(o).toFixed(4));
      vert.textContent = 'Armel Promeneur · N° ' + o.n + ' · ' + o.type;
    }
    // Précharge les voisines pour un défilement fluide
    [p, s].forEach(function (x) { var i = new Image(); i.src = grande(x); });
    if (!anim || mouvementReduit) { if (anim) poser(); return; }
    var jeton = ++jetonHeros;
    fig.classList.add('fondu');
    setTimeout(function () {
      if (jeton !== jetonHeros) return;
      poser();
      var fin = function () { if (jeton === jetonHeros) fig.classList.remove('fondu'); };
      if (img.decode) img.decode().then(fin, fin); else fin();
    }, 260);
  }

  /* ---------- Page : galerie (grille et index) ---------- */
  function etatGalerie(q) {
    return {
      cat: CAT[q.get('cat')] ? q.get('cat') : 'toutes',
      dispo: q.get('dispo') === '1',
      vue: q.get('vue') === 'index' ? 'index' : 'grille'
    };
  }
  function hashGalerie(e) {
    var p = [];
    if (e.cat !== 'toutes') p.push('cat=' + e.cat);
    if (e.dispo) p.push('dispo=1');
    if (e.vue === 'index') p.push('vue=index');
    return '#/galerie' + (p.length ? '?' + p.join('&') : '');
  }
  function avec(e, chg) { var x = { cat: e.cat, dispo: e.dispo, vue: e.vue }; for (var k in chg) x[k] = chg[k]; return x; }

  function pageGalerie(r) {
    var e = etatGalerie(r.q);
    var base = e.dispo ? LISTE.filter(dispo) : LISTE;
    function compte(id) { return id === 'toutes' ? base.length : base.filter(function (o) { return o.cat === id; }).length; }
    var filtres = [{ id: 'toutes', label: 'Toutes' }].concat(CATS).map(function (c) {
      var cur = c.id === e.cat;
      return '<a href="' + hashGalerie(avec(e, { cat: c.id })) + '" data-k="f-' + c.id + '"' + (cur ? ' aria-current="true"' : '') + '>' +
        c.label + ' <span class="mono">' + deux(compte(c.id)) + '</span></a>';
    }).join('');

    var ordre = e.vue === 'index' ? LISTE : ORDRE_GRILLE.map(function (n) { return PAR_N[n]; });
    var liste = ordre.filter(function (o) { return (e.cat === 'toutes' || o.cat === e.cat) && (!e.dispo || dispo(o)); });

    var intro = e.vue === 'index'
      ? '<b>24 œuvres</b> en liste, par numéro. Titre, année, dimensions <span class="ph">[et prix, si à vendre]</span> d\'un coup d\'œil.'
      : '<b>24 œuvres</b>, numérotées de 01 à 24&#8239;: peintures, collages, sculptures et dessins. <span class="ph">[Pièces uniques&#8239;? à confirmer]</span>';

    var res;
    if (!liste.length) {
      res = '<p class="gal-vide">Aucune œuvre ne correspond à ces filtres. <a href="' + hashGalerie(avec(e, { cat: 'toutes', dispo: false })) + '">Voir toutes les œuvres</a></p>';
    } else if (e.vue === 'index') {
      var o0 = liste[0];
      res = '<div class="idx"><div class="idx-liste">' +
        '<div class="ligne ligne-hd mono" aria-hidden="true"><span>N°</span><span></span><span>Titre</span><span>Année</span><span>Dimensions</span><span>Prix · statut</span></div>' +
        liste.map(function (o) {
          return '<a class="ligne" href="' + lienOeuvre(o) + '" data-n="' + o.n + '">' +
            '<span class="mono l-n">' + o.n + '</span>' +
            '<span class="vign"><img src="' + vignette(o) + '" alt="" width="' + o.w + '" height="' + o.h + '" loading="lazy" decoding="async"></span>' +
            '<span class="l-t"><span class="ph">[Titre à fournir]</span> <span class="l-fl" aria-hidden="true">→</span><span class="mono l-type">' + esc(o.type) + '</span></span>' +
            '<span class="phl l-y">[—]</span><span class="phl l-d">[— × — cm]</span>' +
            '<span class="l-p">' + prixCourt(o) + '</span></a>';
        }).join('') +
        '</div>' +
        '<aside class="idx-ap" aria-label="Aperçu de l\'œuvre survolée">' +
          '<div class="ap-mur"><img data-ap="img" src="' + vignette(o0) + '" alt="' + esc(alt(o0)) + '" width="' + o0.w + '" height="' + o0.h + '" style="--r:' + ratio(o0).toFixed(4) + '"></div>' +
          '<div class="ap-cap"><b>N° <span data-ap="n">' + o0.n + '</span> · <span class="ph">[Titre à fournir]</span></b><span class="mono" data-ap="type">' + esc(o0.type) + '</span></div>' +
          '<p class="mono ap-note">Survolez une ligne pour voir l\'œuvre en grand, entière.</p>' +
        '</aside></div>';
    } else {
      res = '<div class="justif" id="grille"></div>';
    }

    var n = liste.length;
    var html =
      '<div class="wrap">' +
        '<div class="gal-hd">' +
          '<div class="gal-hd-l"><h1 class="titre-xl" tabindex="-1">Galerie</h1><span class="mono m-only">24 œuvres</span></div>' +
          '<p class="gal-intro d-only">' + intro + '</p>' +
          '<p class="gal-intro-m m-only">Peintures, collages, sculptures et dessins, numérotés de 01 à 24.</p>' +
        '</div>' +
        '<div class="fbar">' +
          '<nav class="filtres" aria-label="Filtres de la galerie">' + filtres + '</nav>' +
          '<div class="fctl">' +
            '<button type="button" class="sw" role="switch" aria-checked="' + e.dispo + '" data-k="sw"><span class="sw-piste" aria-hidden="true"><span class="sw-pion"></span></span>Disponibles seulement</button>' +
            '<div class="vue" role="group" aria-label="Affichage">' +
              '<button type="button" aria-pressed="' + (e.vue === 'grille') + '" data-vue="grille" data-k="v-grille"><span class="vue-box">Grille</span></button>' +
              '<button type="button" aria-pressed="' + (e.vue === 'index') + '" data-vue="index" data-k="v-index"><span class="vue-box">Index</span></button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<section class="gal-res" aria-label="Œuvres">' + res + '</section>' +
        '<div class="gal-ft"><span class="mono">' + n + (n > 1 ? ' œuvres' : ' œuvre') + ' sur ' + TOTAL + '</span>' +
          (e.vue === 'grille' ? '<a class="lien-s" href="' + hashGalerie(avec(e, { vue: 'index' })) + '">Voir la liste complète (index) →</a>' : '') +
        '</div>' +
      '</div>';

    return {
      html: html, titre: (e.cat !== 'toutes' ? CAT[e.cat].label + ' · ' : '') + 'Galerie', nav: 'galerie', pied: 'defaut',
      annonce: n + (n > 1 ? ' œuvres' : ' œuvre') + ' sur ' + TOTAL,
      apres: function () {
        justifier($('#grille'), liste, nGalerie, { prix: true, replier: true });
        $('.sw', main).addEventListener('click', function () { location.hash = hashGalerie(avec(e, { dispo: !e.dispo })); });
        $$('[data-vue]', main).forEach(function (b) {
          b.addEventListener('click', function () { if (b.dataset.vue !== e.vue) location.hash = hashGalerie(avec(e, { vue: b.dataset.vue })); });
        });
        // Index : le survol ou le focus d'une ligne met à jour l'aperçu
        var ap = $('.idx-ap', main);
        var lst = $('.idx-liste', main);
        if (ap && lst) {
          var majAp = function (ev) {
            var l = ev.target.closest && ev.target.closest('a.ligne');
            if (!l || l.classList.contains('actif')) return;
            var o = PAR_N[l.dataset.n];
            $$('a.ligne.actif', lst).forEach(function (x) { x.classList.remove('actif'); });
            l.classList.add('actif');
            var img = $('[data-ap="img"]', ap);
            img.src = vignette(o); img.alt = alt(o); img.width = o.w; img.height = o.h;
            img.style.setProperty('--r', ratio(o).toFixed(4));
            $('[data-ap="n"]', ap).textContent = o.n;
            $('[data-ap="type"]', ap).textContent = o.type;
          };
          lst.addEventListener('pointerover', majAp);
          lst.addEventListener('focusin', majAp);
        }
      }
    };
  }

  /* ---------- Page : fiche œuvre ---------- */
  function pageOeuvre(r) {
    var o = r.oeuvre;
    var c = CAT[o.cat], cp = CAT_PLUS[o.cat];
    var p = voisin(o, -1), s = voisin(o, 1);
    var memeCat = LISTE.filter(function (x) { return x.cat === o.cat; });
    // Jusqu'à 4 autres œuvres de la même catégorie (à partir de la suivante), complétées par d'autres
    var autres = [];
    for (var k = 1; k < TOTAL && autres.length < 4; k++) { var x = voisin(o, k); if (x.cat === o.cat) autres.push(x); }
    for (k = 1; k < TOTAL && autres.length < 4; k++) { x = voisin(o, k); if (x.cat !== o.cat) autres.push(x); }
    var lienCat = hashGalerie({ cat: o.cat, dispo: false, vue: 'grille' });
    var contact = '#/contact?oeuvre=' + o.n + '&demande=';

    var boutons = dispo(o)
      ? '<a class="btn btn-noir" href="' + contact + 'acheter">Acheter <span aria-hidden="true">→</span></a>' +
        '<a class="btn btn-ligne" href="' + contact + 'infos">Demander des infos <span aria-hidden="true">→</span></a>'
      : '<a class="btn btn-noir" href="' + contact + 'infos">Demander une œuvre semblable <span aria-hidden="true">→</span></a>';
    var prix = dispo(o)
      ? '<div class="fi-prix"><span class="mono">Prix</span><span class="fi-prix-v">' + chf(o.prix) + '</span></div><p class="fi-note"><span class="ex">Prix d\'exemple</span></p>'
      : '<div class="fi-prix"><span class="mono">Prix</span><span class="fi-prix-v">Vendue' + EX + '</span></div>';

    var ligneTab = function (th, td, ph) { return '<tr><th scope="row">' + th + '</th><td>' + (ph ? '<span class="ph">' + td + '</span>' : td) + '</td></tr>'; };

    var html =
      '<div class="wrap">' +
        '<div class="fi-barre">' +
          '<nav class="mono fil d-only" aria-label="Fil d\'Ariane"><a href="#/galerie">Galerie</a> <span aria-hidden="true">/</span> <a href="' + lienCat + '">' + c.label + '</a> <span aria-hidden="true">/</span> <span aria-current="page">N° ' + o.n + '</span></nav>' +
          '<a class="fi-retour m-only" href="#/galerie">← Galerie</a>' +
          '<div class="fi-pn">' +
            '<a href="' + lienOeuvre(p) + '" aria-label="Œuvre précédente, N° ' + p.n + '"><span aria-hidden="true">←<span class="d-only"> Précédente</span></span></a>' +
            '<span class="mono">' + o.n + ' / ' + TOTAL + '</span>' +
            '<a href="' + lienOeuvre(s) + '" aria-label="Œuvre suivante, N° ' + s.n + '"><span aria-hidden="true"><span class="d-only">Suivante </span>→</span></a>' +
          '</div>' +
        '</div>' +
        '<div class="fi">' +
          '<div class="fi-media">' +
            '<div class="fi-mur"><button type="button" class="fi-zoom" data-zoom aria-label="Voir l\'œuvre N° ' + o.n + ' en grand"><img src="' + grande(o) + '" alt="' + esc(alt(o)) + ', vue entière" width="' + o.w + '" height="' + o.h + '" fetchpriority="high" style="--r:' + ratio(o).toFixed(4) + '"></button></div>' +
            '<div class="fi-vues">' +
              '<button type="button" class="vue1" data-zoom aria-pressed="true" aria-label="Vue 1 : l\'œuvre entière"><img src="' + vignette(o) + '" alt="" width="' + o.w + '" height="' + o.h + '"></button>' +
              '<div class="vue-ph"><span class="d-only">[Photo de détail ' + cp.detail + ']</span><span class="m-only">[Détail]</span></div>' +
              '<div class="vue-ph"><span class="d-only">[Photo de la signature]</span><span class="m-only">[Signature]</span></div>' +
              '<div class="vue-ph"><span class="d-only">[Vue à l\'échelle, quand les dimensions seront connues]</span><span class="m-only">[Vue à l\'échelle]</span></div>' +
            '</div>' +
          '</div>' +
          '<div class="fi-info">' +
            '<p class="mono fi-k">N° ' + o.n + ' — ' + esc(o.type) + '</p>' +
            '<h1 tabindex="-1"><span class="ph">[Titre à fournir]</span></h1>' +
            '<p>Armel Promeneur, <span class="ph">[année]</span></p>' +
            '<table class="fi-tab"><tbody>' +
              ligneTab('Technique', '[à fournir]', true) +
              ligneTab('Support', '[papier, toile, carton ?]', true) +
              ligneTab('Dimensions', '[H × L cm]', true) +
              ligneTab('Édition', '[pièce unique, signée ?]', true) +
              ligneTab('Encadrement', '[encadrée ou non]', true) +
              ligneTab('Statut', statut(o), false) +
            '</tbody></table>' +
            prix +
            '<div class="fi-btns">' + boutons + '</div>' +
            '<div class="fi-det">' +
              '<details><summary><span class="mono">01</span><span>À propos de l\'œuvre</span><span class="plus" aria-hidden="true"></span></summary><p><span class="ph d-only">[Quelques lignes d\'Armel sur cette œuvre : ce qu\'elle montre, comment elle est faite.]</span><span class="ph m-only">[Quelques lignes d\'Armel sur cette œuvre.]</span></p></details>' +
              '<details><summary><span class="mono">02</span><span>Livraison et retrait</span><span class="plus" aria-hidden="true"></span></summary><p><span class="ph d-only">[À définir avec Armel : envoi en Suisse et à l\'étranger, emballage, retrait sur place.]</span><span class="ph m-only">[À définir avec Armel.]</span></p></details>' +
              '<details><summary><span class="mono">03</span><span>Paiement, certificat et retours</span><span class="plus" aria-hidden="true"></span></summary><p><span class="ph d-only">[À définir : moyens de paiement, certificat d\'authenticité, conditions de retour.]</span><span class="ph m-only">[À définir avec Armel.]</span></p></details>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<section class="autres" aria-labelledby="autres">' +
          '<div class="sec-hd"><h2 id="autres">Autres ' + c.label.toLowerCase() + '</h2>' +
            '<div class="sec-hd-r"><span class="mono d-only">' + memeCat.length + ' ' + c.label.toLowerCase() + '</span>' +
            '<a class="lien-s d-only" href="' + lienCat + '">' + cp.tous + ' →</a><a class="lien-s m-only" href="' + lienCat + '">Tous →</a></div></div>' +
          '<div class="justif serre" id="autres-liste"></div>' +
        '</section>' +
      '</div>';

    return {
      html: html, titre: 'N° ' + o.n + ' · ' + o.type, nav: 'galerie', pied: 'defaut',
      apres: function () {
        justifier($('#autres-liste'), autres, nAutres);
        $$('[data-zoom]', main).forEach(function (b) { b.addEventListener('click', function () { ouvrirVisio(o, b); }); });
        [p, s].forEach(function (x) { var i = new Image(); i.src = grande(x); });
      }
    };
  }

  /* ---------- Visionneuse plein écran ---------- */
  var visio = document.getElementById('visio');
  var visioImg = document.getElementById('visio-img');
  var visioX = document.getElementById('visio-x');
  var visioRetour = null;
  function ouvrirVisio(o, declencheur) {
    visioRetour = declencheur || null;
    visioImg.src = grande(o);
    visioImg.alt = alt(o) + ', vue entière';
    visio.setAttribute('aria-label', 'Œuvre N° ' + o.n + ' en grand');
    visio.hidden = false;
    bloquer(true);
    visioX.focus();
  }
  function fermerVisio(rendre) {
    if (visio.hidden) return;
    visio.hidden = true;
    bloquer(false);
    if (rendre && visioRetour) visioRetour.focus();
    visioRetour = null;
  }
  visio.addEventListener('click', function () { fermerVisio(true); });

  /* ---------- Page : à propos ---------- */
  function pageAPropos() {
    var html =
      '<div class="wrap">' +
        '<section class="ap">' +
          '<figure class="ap-fig"><img src="img/portrait-armel.jpg" alt="Portrait d\'Armel Promeneur, chapeau et lunettes rondes" width="1110" height="1110">' +
            '<figcaption class="mono">Armel Promeneur · photo <span class="ph">[crédit à fournir]</span></figcaption></figure>' +
          '<div class="ap-c">' +
            '<p class="mono">À propos</p>' +
            '<h1 tabindex="-1"><span>Peintre et sculpteur,</span><span>de la Guadeloupe</span><span>à la Suisse.</span></h1>' +
            '<table class="tab"><tbody>' +
              '<tr><th scope="row">Origine</th><td>Guadeloupe</td></tr>' +
              '<tr><th scope="row">Vit et travaille</th><td>En Suisse, <span class="ph">[ville à fournir]</span></td></tr>' +
              '<tr><th scope="row">Pratique</th><td>Peinture, collage, sculpture sur bois, dessin</td></tr>' +
              '<tr><th scope="row">Expositions</th><td>Pop-up Pepeuf, Markthalle Basel, 22–28 juin 2026<br><span class="ph">[autres expositions à fournir]</span></td></tr>' +
              '<tr><th scope="row">Instagram</th><td><a href="' + INSTA + '" target="_blank" rel="noopener">@promeneur_armel_studio ↗</a></td></tr>' +
            '</tbody></table>' +
            '<p class="ap-bio"><span class="ph">[Biographie à écrire avec Armel, cinq à huit lignes : son parcours, ses techniques, les artistes qui l\'inspirent (il a signé des hommages à Wifredo Lam et à Picasso).]</span></p>' +
            '<p class="ap-lien"><a href="#/contact">Écrire à Armel <span aria-hidden="true">→</span></a></p>' +
          '</div>' +
        '</section>' +
        '<section class="ap-photos" aria-label="Au travail et en exposition">' +
          '<figure class="f1"><img src="img/atelier-bois.jpg" alt="Armel Promeneur travaillant le bois dehors, dans un jardin" loading="lazy" decoding="async"><figcaption><span>Le bois, travaillé dehors</span><span class="mono">01</span></figcaption></figure>' +
          '<figure class="f2"><img src="img/exposition-minoterie.jpg" alt="Une œuvre d\'Armel Promeneur accrochée au mur d\'une salle" loading="lazy" decoding="async"><figcaption><span>Accrochage <span class="ph">[lieu et date à fournir]</span></span><span class="mono">02</span></figcaption></figure>' +
          '<figure class="f3"><img src="img/atelier-peinture.jpg" alt="Armel Promeneur peignant un grand portrait" loading="lazy" decoding="async"><figcaption><span>La peinture, en grand format</span><span class="mono">03</span></figcaption></figure>' +
        '</section>' +
      '</div>';
    return { html: html, titre: 'À propos', nav: 'a-propos', pied: 'defaut' };
  }

  /* ---------- Page : contact ---------- */
  var SOUHAITS = { acheter: 'Acheter cette œuvre', infos: 'En savoir plus', autre: 'Autre demande' };

  function pageContact(r) {
    var nSel = PAR_N[r.q.get('oeuvre')] ? r.q.get('oeuvre') : '';
    var d = r.q.get('demande');
    var souhait = SOUHAITS[d] ? d : 'infos';
    var options = '<option value=""' + (nSel ? '' : ' selected') + '>Aucune en particulier</option>' +
      LISTE.map(function (o) {
        return '<option value="' + o.n + '"' + (o.n === nSel ? ' selected' : '') + '>N° ' + o.n + ' · ' + esc(o.type) + (dispo(o) ? '' : ' (vendue, exemple)') + '</option>';
      }).join('');
    var radios = Object.keys(SOUHAITS).map(function (k) {
      return '<label><input type="radio" name="souhait" value="' + k + '"' + (k === souhait ? ' checked' : '') + '>' + SOUHAITS[k] + '</label>';
    }).join('');

    var html =
      '<div class="wrap"><section class="ct">' +
        '<div class="ct-g">' +
          '<h1 tabindex="-1">Contact</h1>' +
          '<p class="ct-lead">Une question sur une œuvre&#8239;? <span class="nw">Écrivez avec ce formulaire.</span></p>' +
          '<dl class="ct-dl">' +
            '<div><dt class="mono">E-mail</dt><dd><span class="ph">[adresse à fournir]</span></dd></div>' +
            '<div><dt class="mono">Instagram</dt><dd><a href="' + INSTA + '" target="_blank" rel="noopener">@promeneur_armel_studio ↗</a></dd></div>' +
            '<div><dt class="mono">Lieu</dt><dd>En Suisse, <span class="ph">[ville]</span></dd></div>' +
          '</dl>' +
        '</div>' +
        '<div class="ct-d">' +
          '<form class="form" id="form" action="#" novalidate aria-label="Écrire à Armel">' +
            '<div class="ch"><label for="c-nom" class="mono ch-l">Nom *</label><div><input id="c-nom" name="nom" type="text" autocomplete="name" required placeholder="Prénom et nom" aria-describedby="c-nom-err"><span class="err" id="c-nom-err" hidden></span></div></div>' +
            '<div class="ch"><label for="c-mail" class="mono ch-l">E-mail *</label><div><input id="c-mail" name="email" type="email" autocomplete="email" required placeholder="nom@exemple.ch" aria-describedby="c-mail-err"><span class="err" id="c-mail-err" hidden></span></div></div>' +
            '<div class="ch"><label for="c-tel" class="mono ch-l">Téléphone</label><div><input id="c-tel" name="telephone" type="tel" autocomplete="tel" placeholder="Facultatif"></div></div>' +
            '<div class="ch"><label for="c-oeuvre" class="mono ch-l">Œuvre</label><div><select id="c-oeuvre" name="oeuvre">' + options + '</select></div></div>' +
            '<fieldset class="ch"><legend class="vh">Je souhaite</legend><span class="mono ch-l" aria-hidden="true">Je souhaite</span><div class="radios">' + radios + '</div></fieldset>' +
            '<div class="ch"><label for="c-msg" class="mono ch-l">Message *</label><div><textarea id="c-msg" name="message" rows="6" required placeholder="Votre message" aria-describedby="c-msg-err"></textarea><span class="err" id="c-msg-err" hidden></span></div></div>' +
            '<div class="ch ch-env"><span class="mono">* obligatoire</span><div>' +
              '<p class="ct-note">Vos données servent uniquement à répondre à votre message. Plus d\'informations dans la <a href="#/impressum/protection-donnees">protection des données</a>.</p>' +
              '<button type="submit" class="btn-env">Envoyer <span aria-hidden="true">→</span></button>' +
            '</div></div>' +
          '</form>' +
          '<div class="merci" id="merci" hidden></div>' +
        '</div>' +
      '</section></div>';

    return { html: html, titre: 'Contact', nav: 'contact', pied: 'contact', apres: brancherFormulaire };
  }

  function brancherFormulaire() {
    var form = $('#form', main), merci = $('#merci', main);
    var nom = $('#c-nom', form), mail = $('#c-mail', form), tel = $('#c-tel', form), sel = $('#c-oeuvre', form), msg = $('#c-msg', form);
    var regles = [
      [nom, function (v) { return v.trim() ? '' : 'Indiquez votre nom.'; }],
      [mail, function (v) {
        v = v.trim();
        if (!v) return 'Indiquez votre adresse e-mail.';
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Cette adresse e-mail ne semble pas complète (exemple : nom@exemple.ch).';
      }],
      [msg, function (v) { return v.trim() ? '' : 'Écrivez votre message.'; }]
    ];
    function montrer(champ, texte) {
      var err = document.getElementById(champ.id + '-err');
      err.textContent = texte; err.hidden = !texte;
      if (texte) champ.setAttribute('aria-invalid', 'true'); else champ.removeAttribute('aria-invalid');
    }
    // Une erreur affichée disparaît dès que le champ est corrigé
    regles.forEach(function (rg) {
      rg[0].addEventListener('input', function () { if (rg[0].getAttribute('aria-invalid')) montrer(rg[0], rg[1](rg[0].value)); });
    });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var premier = null;
      regles.forEach(function (rg) { var t = rg[1](rg[0].value); montrer(rg[0], t); if (t && !premier) premier = rg[0]; });
      if (premier) { premier.focus(); return; }
      // Prototype : AUCUN envoi réseau, on affiche seulement un résumé
      var choix = form.querySelector('input[name="souhait"]:checked');
      var lignes = [
        ['Nom', nom.value.trim()], ['E-mail', mail.value.trim()],
        tel.value.trim() ? ['Téléphone', tel.value.trim()] : null,
        ['Œuvre', sel.options[sel.selectedIndex].text],
        ['Je souhaite', choix ? SOUHAITS[choix.value] : '—'],
        ['Message', msg.value.trim()]
      ].filter(Boolean);
      merci.innerHTML = '<div class="merci-boite" role="status">' +
        '<h2 tabindex="-1">Merci&#8239;!</h2>' +
        '<p class="merci-txt">Sur le vrai site, ce message partirait chez Armel. Ici, c\'est un prototype&#8239;: rien n\'a été envoyé.</p>' +
        '<dl class="merci-dl">' + lignes.map(function (l) { return '<div><dt class="mono">' + l[0] + '</dt><dd>' + esc(l[1]) + '</dd></div>'; }).join('') + '</dl>' +
        '<button type="button" class="btn btn-ligne" id="encore">Écrire un autre message <span aria-hidden="true">→</span></button></div>';
      form.hidden = true; merci.hidden = false;
      $('h2', merci).focus();
      $('#encore', merci).addEventListener('click', function () {
        form.reset();
        regles.forEach(function (rg) { montrer(rg[0], ''); });
        merci.hidden = true; merci.innerHTML = ''; form.hidden = false;
        nom.focus();
      });
    });
  }

  /* ---------- Page : impressum et protection des données ---------- */
  function pageImpressum() {
    var html =
      '<div class="wrap">' +
        '<section class="lg-top">' +
          '<nav aria-label="Fil d\'Ariane" class="mono fil"><a href="#/">Accueil</a> <span aria-hidden="true">/</span> Impressum et protection des données</nav>' +
          '<h1 tabindex="-1">Impressum <span class="nw">et protection</span> <span class="nw">des données</span></h1>' +
          '<p class="lg-lead">Qui est derrière ce site, et ce qui est fait de vos informations, en mots simples.</p>' +
        '</section>' +
        '<div class="lg-corps">' +
          '<aside class="lg-aside" aria-label="En bref">' +
            '<p class="mono">En bref</p>' +
            '<ul class="lg-bref">' +
              '<li><span aria-hidden="true">✓</span>Aucun cookie publicitaire ni outil de suivi des visiteurs.</li>' +
              '<li><span aria-hidden="true">✓</span>Vos messages servent uniquement à vous répondre.</li>' +
              '<li><span aria-hidden="true">✓</span>Vos données ne sont ni vendues ni louées.</li>' +
            '</ul>' +
            '<nav class="lg-toc" aria-label="Sur cette page"><span class="mono">Sur cette page</span>' +
              '<a href="#/impressum/impressum">Impressum →</a>' +
              '<a href="#/impressum/protection-donnees">Protection des données →</a>' +
              '<a href="#/impressum/vos-droits">Vos droits →</a>' +
            '</nav>' +
          '</aside>' +
          '<div class="lg">' +
            '<section id="impressum" aria-labelledby="imp-titre">' +
              '<h2 id="imp-titre" tabindex="-1">Impressum</h2>' +
              '<div class="lg-cols">' +
                '<div><p class="mono">Responsable du site</p><p><strong>Armel Promeneur</strong> <span class="ph">[nom civil, si différent du nom d\'artiste]</span><br>Peintre et sculpteur<br><span class="ph">[adresse postale à fournir]</span><br><span class="ph">[NPA, localité]</span></p></div>' +
                '<div><p class="mono">Contact</p><p><span class="ph">[e-mail à fournir]</span><br>Instagram <a href="' + INSTA + '" target="_blank" rel="noopener">@promeneur_armel_studio</a></p></div>' +
              '</div>' +
              '<h3>Registre du commerce</h3>' +
              '<p><span class="ph">[Aucune inscription trouvée sur Zefix : indiquer le numéro IDE s\'il existe, sinon retirer ce paragraphe.]</span></p>' +
              '<h3>Conception du site</h3>' +
              '<p>CyberActivities, Dylan Borcard, Fribourg.</p>' +
              '<h3>Droits d\'auteur</h3>' +
              '<p>Les œuvres, les photos et les textes de ce site appartiennent à Armel Promeneur, sauf mention contraire <span class="ph">[auteur des photos à confirmer]</span>. Leur reproduction demande son accord écrit.</p>' +
              '<h3>Prix et vente</h3>' +
              '<p><span class="ph">[Si les œuvres se vendent par le site :]</span> les prix sont indiqués en francs suisses (CHF) et sont les prix effectivement à payer&#8239;; les frais de livraison <span class="ph">[sont indiqués avant la commande]</span>. La disponibilité d\'une œuvre unique vous est confirmée à la commande.</p>' +
              '<p><span class="ph">[Conditions de vente : lien vers la page CGV, à rédiger.]</span></p>' +
              '<h3>Responsabilité</h3>' +
              '<p>Les informations de ce site sont soignées et tenues à jour, mais des erreurs restent possibles. Le lien vers Instagram mène à un autre site, dont le contenu ne dépend pas d\'Armel Promeneur.</p>' +
            '</section>' +
            '<section id="protection-donnees" class="lg-pd" aria-labelledby="pd-titre">' +
              '<h2 id="pd-titre" tabindex="-1">Protection des données</h2>' +
              '<p style="margin-top:16px">Cette déclaration explique comment Armel Promeneur traite vos données personnelles, selon la loi fédérale sur la protection des données (LPD).</p>' +
              '<h3>Qui est responsable&#8239;?</h3>' +
              '<p>Armel Promeneur, <span class="ph">[adresse postale à fournir]</span>, <span class="ph">[e-mail à fournir]</span>.</p>' +
              '<h3>Quelles données, et pourquoi&#8239;?</h3>' +
              '<ul>' +
                '<li><strong>Formulaire de contact :</strong> votre nom, votre e-mail, votre téléphone si vous le donnez, l\'œuvre qui vous intéresse et votre message. Ils servent à vous répondre.</li>' +
                '<li><strong>Achat d\'une œuvre</strong> <span class="ph">[si la vente passe par le site]</span> : en plus, votre adresse de livraison et les données de la commande, pour vous livrer et établir la facture. <span class="ph">[Moyen de paiement à définir : s\'il passe par un prestataire, le nommer ici.]</span></li>' +
                '<li><strong>Visite du site :</strong> comme tout site, le serveur enregistre des données techniques (adresse IP, date et heure, page consultée, type de navigateur). Elles servent seulement à faire fonctionner le site et à le protéger contre les abus.</li>' +
              '</ul>' +
              '<p>Vos données ne servent pas à de la publicité et ne sont pas vendues.</p>' +
              '<h3>Cookies et outils de suivi</h3>' +
              '<p>Ce site n\'utilise ni cookie publicitaire, ni outil de mesure d\'audience, ni bouton de réseau social. <span class="ph">[Si la vente passe par le site : seuls des cookies techniques, nécessaires au panier et au paiement.]</span> <span class="ph">[Les polices d\'écriture sont hébergées sur le serveur du site.]</span> Le lien Instagram n\'ouvre Instagram que si vous cliquez : Meta traite alors vos données selon ses propres règles.</p>' +
              '<h3>Qui reçoit vos données&#8239;?</h3>' +
              '<ul>' +
                '<li><strong>Armel Promeneur,</strong> qui lit vos messages et y répond.</li>' +
                '<li><strong>L\'hébergeur du site</strong> <span class="ph">[en Suisse, à confirmer]</span>, qui garde le site et les messages pour lui, sans les utiliser à ses propres fins.</li>' +
                '<li><strong>L\'outil d\'envoi du formulaire</strong> <span class="ph">[à confirmer]</span> et <strong>le fournisseur de messagerie</strong> <span class="ph">[à confirmer]</span>.</li>' +
                '<li><strong>Pour un achat,</strong> <span class="ph">[le prestataire de paiement et le transporteur, à définir]</span>.</li>' +
                '<li><strong>Les autorités,</strong> seulement lorsque la loi l\'exige.</li>' +
              '</ul>' +
              '<h3>Données envoyées à l\'étranger</h3>' +
              '<p><span class="ph">[À compléter quand les prestataires seront choisis : si l\'un d\'eux traite des données hors de Suisse, le nommer avec le pays et la garantie prévue (par exemple Stripe : Irlande et États-Unis, Swiss-U.S. Data Privacy Framework, à vérifier avant la mise en ligne). Pour une livraison hors de Suisse, l\'adresse est transmise au transporteur et aux douanes du pays de destination.]</span></p>' +
              '<h3>Combien de temps&#8239;?</h3>' +
              '<ul>' +
                '<li>Les messages sont effacés quand ils ne servent plus à vous répondre ni à suivre une vente.</li>' +
                '<li><span class="ph">[Si Armel établit des factures :]</span> les factures et les pièces comptables sont conservées 10 ans, comme la loi l\'exige.</li>' +
                '<li>Les données techniques des visites sont effacées après <span class="ph">[durée fixée par l\'hébergeur, par exemple 30 jours]</span>.</li>' +
              '</ul>' +
              '<h3>Sécurité</h3>' +
              '<p>Le site est servi en connexion chiffrée (HTTPS). Seules les personnes qui en ont besoin pour vous répondre ont accès à vos messages.</p>' +
              '<h3 id="vos-droits" tabindex="-1">Vos droits</h3>' +
              '<p>Vous pouvez demander à tout moment quelles données sont conservées sur vous, les faire corriger ou effacer (sauf celles que la loi oblige à garder), et vous opposer à leur traitement. Écrivez à <span class="ph">[e-mail à fournir]</span>. Si la réponse ne vous satisfait pas, vous pouvez le signaler au Préposé fédéral à la protection des données et à la transparence (PFPDT, <a href="https://www.edoeb.admin.ch" target="_blank" rel="noopener">edoeb.admin.ch</a>) ou faire valoir vos droits devant les tribunaux.</p>' +
              '<h3>Changements</h3>' +
              '<p>Cette déclaration est adaptée si la façon de faire change. Version du <span class="ph">[date de mise en ligne]</span>.</p>' +
            '</section>' +
          '</div>' +
        '</div>' +
      '</div>';
    return { html: html, titre: 'Impressum et protection des données', nav: '', pied: 'defaut' };
  }

  /* ---------- Page introuvable ---------- */
  function pageIntrouvable() {
    var html = '<div class="wrap"><section class="introuv">' +
      '<h1 tabindex="-1">Page introuvable</h1>' +
      '<a class="lien-s" href="#/galerie">Voir la galerie →</a>' +
      '</section></div>';
    return { html: html, titre: 'Page introuvable', nav: '', pied: 'defaut' };
  }

  /* ---------- Routage ---------- */
  var PAGES = {
    accueil: pageAccueil, galerie: pageGalerie, oeuvre: pageOeuvre, 'a-propos': pageAPropos,
    contact: pageContact, impressum: pageImpressum, introuvable: pageIntrouvable
  };
  var SOUS_IMPRESSUM = ['impressum', 'protection-donnees', 'vos-droits'];

  function analyser() {
    var h = location.hash || '';
    var vide = new URLSearchParams('');
    if (h === '' || h === '#' || h === '#/') return { page: 'accueil', q: vide };
    if (h.slice(0, 2) !== '#/') return null; // simple ancre : on ne change pas de page
    var reste = h.slice(2);
    var qi = reste.indexOf('?');
    var chemin = qi < 0 ? reste : reste.slice(0, qi);
    var q = new URLSearchParams(qi < 0 ? '' : reste.slice(qi + 1));
    var seg = chemin.split('/').filter(Boolean).map(function (s) { try { return decodeURIComponent(s); } catch (e) { return s; } });
    var r = { page: 'introuvable', q: q };
    if (!seg.length) r.page = 'accueil';
    else if (seg.length === 1 && seg[0] === 'galerie') r.page = 'galerie';
    else if (seg.length === 1 && seg[0] === 'a-propos') r.page = 'a-propos';
    else if (seg.length === 1 && seg[0] === 'contact') r.page = 'contact';
    else if (seg[0] === 'oeuvre' && seg.length === 2 && PAR_N[seg[1]]) { r.page = 'oeuvre'; r.oeuvre = PAR_N[seg[1]]; }
    else if (seg[0] === 'impressum' && seg.length <= 2) {
      r.page = 'impressum';
      if (seg[1] && SOUS_IMPRESSUM.indexOf(seg[1]) >= 0) r.sous = seg[1];
      else if (seg[1]) r.page = 'introuvable';
    }
    return r;
  }

  function allerA(id, focus) {
    var cible = document.getElementById(id);
    if (!cible) return;
    cible.scrollIntoView({ block: 'start' });
    if (focus) {
      var t = cible.matches('h2, h3') ? cible : cible.querySelector('h2, h3');
      if (t) t.focus({ preventScroll: true });
    }
  }

  function majNav(cle) {
    $$('[data-nav]').forEach(function (a) {
      if (cle && a.dataset.nav === cle) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  var actuel = null;
  var premiere = true;
  function router() {
    var r = analyser();
    if (!r) return;
    fermerMenu(false);
    fermerVisio(false);

    // Sous-ancre de l'impressum sur la même page : on défile seulement
    if (actuel && actuel.page === 'impressum' && r.page === 'impressum') {
      actuel = r;
      allerA(r.sous || 'impressum', true);
      return;
    }

    // Galerie → galerie (filtres) : on garde le défilement et le focus
    var meme = actuel && actuel.page === 'galerie' && r.page === 'galerie';
    var cle = meme && document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.k : null;
    var filtres = meme ? $('.filtres', main) : null;
    var scrollFiltres = filtres ? filtres.scrollLeft : 0;

    var p = PAGES[r.page](r);
    blocs = [];
    document.body.setAttribute('data-page', r.page);
    main.innerHTML = p.html;
    pied.innerHTML = piedHtml(p.pied);
    document.title = r.page === 'accueil' ? p.titre : p.titre + ' — ' + NOM;
    majNav(p.nav);
    if (p.apres) p.apres();

    // Zone d'annonce fixe (hors de <main>) : le nouveau nombre d'œuvres est lu après un changement de filtre
    var statutEl = document.getElementById('annonce');
    if (statutEl) statutEl.textContent = meme && p.annonce ? p.annonce : '';

    if (meme) {
      var f2 = $('.filtres', main);
      if (f2) f2.scrollLeft = scrollFiltres;
      if (cle) { var el = $('[data-k="' + cle + '"]', main); if (el) el.focus({ preventScroll: true }); }
    } else {
      if (r.sous) allerA(r.sous, false); else window.scrollTo(0, 0);
      if (!premiere) { var h1 = $('h1', main); if (h1) h1.focus({ preventScroll: true }); }
    }
    premiere = false;
    actuel = r;
  }

  /* ---------- Menu plein écran (téléphone) ---------- */
  var menu = document.getElementById('menu');
  var btnMenu = document.getElementById('menu-btn');
  var btnFermer = document.getElementById('menu-x');
  function bloquer(oui) {
    var ouvert = oui || !menu.hidden || !visio.hidden;
    document.documentElement.classList.toggle('bloque', ouvert);
  }
  function ouvrirMenu() {
    menu.hidden = false;
    btnMenu.setAttribute('aria-expanded', 'true');
    bloquer(true);
    btnFermer.focus();
  }
  function fermerMenu(rendre) {
    if (menu.hidden) return;
    menu.hidden = true;
    btnMenu.setAttribute('aria-expanded', 'false');
    bloquer(false);
    if (rendre) btnMenu.focus();
  }
  btnMenu.addEventListener('click', ouvrirMenu);
  btnFermer.addEventListener('click', function () { fermerMenu(true); });
  menu.addEventListener('click', function (ev) {
    var a = ev.target.closest('a');
    if (a) fermerMenu(false); // le changement de page place le focus sur le titre
  });

  // Garde le focus dans une fenêtre ouverte (menu ou visionneuse)
  function pieger(ev, boite) {
    var f = $$('a[href], button:not([disabled])', boite).filter(function (e) { return e.offsetParent !== null; });
    if (!f.length) return;
    var i = f.indexOf(document.activeElement);
    if (ev.shiftKey && (i <= 0)) { ev.preventDefault(); f[f.length - 1].focus(); }
    else if (!ev.shiftKey && (i === f.length - 1 || i < 0)) { ev.preventDefault(); f[0].focus(); }
  }

  /* ---------- Clavier ---------- */
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') {
      if (!visio.hidden) { fermerVisio(true); return; }
      if (!menu.hidden) { fermerMenu(true); return; }
    }
    if (ev.key === 'Tab') {
      if (!visio.hidden) { pieger(ev, visio); return; }
      if (!menu.hidden) { pieger(ev, menu); return; }
    }
    // Fiche œuvre : ← → pour passer à l'œuvre voisine (sauf dans un champ)
    if ((ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') && actuel && actuel.page === 'oeuvre' &&
        visio.hidden && menu.hidden && !ev.altKey && !ev.ctrlKey && !ev.metaKey && !ev.shiftKey) {
      var t = ev.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      ev.preventDefault();
      location.hash = lienOeuvre(voisin(actuel.oeuvre, ev.key === 'ArrowLeft' ? -1 : 1));
    }
  });

  /* ---------- Lien « Aller au contenu » ---------- */
  $('.saut').addEventListener('click', function (ev) {
    ev.preventDefault();
    var h1 = $('h1', main);
    (h1 || main).focus();
    (h1 || main).scrollIntoView({ block: 'start' });
  });

  /* ---------- Bandeau du prototype ---------- */
  var CLE_BANDEAU = 'armel-proto-bandeau-ferme';
  var bandeau = document.getElementById('proto');
  try { if (window.localStorage.getItem(CLE_BANDEAU) === '1') bandeau.hidden = true; } catch (e) { /* stockage indisponible */ }
  document.getElementById('proto-x').addEventListener('click', function () {
    bandeau.hidden = true;
    try { window.localStorage.setItem(CLE_BANDEAU, '1'); } catch (e) { /* le site marche sans */ }
    var h1 = $('h1', main);
    (h1 || main).focus({ preventScroll: true });
  });

  /* ---------- Redimensionnement ---------- */
  var minuterie = null;
  window.addEventListener('resize', function () {
    clearTimeout(minuterie);
    minuterie = setTimeout(function () {
      blocs.forEach(function (b) { if (document.body.contains(b.el)) dessinerBloc(b); });
      if (window.innerWidth >= 760) fermerMenu(false);
    }, 150);
  });

  /* ---------- Lien vers la page déjà ouverte (impressum) ---------- */
  // Le hash ne change pas, donc pas de hashchange : on défile nous-mêmes vers la section (ou en haut)
  document.addEventListener('click', function (ev) {
    if (ev.defaultPrevented || ev.button !== 0 || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) return;
    var a = ev.target.closest && ev.target.closest('a[href^="#/impressum"]');
    if (!a || a.getAttribute('href') !== location.hash || !actuel || actuel.page !== 'impressum') return;
    ev.preventDefault();
    fermerMenu(false);
    if (actuel.sous) { allerA(actuel.sous, true); return; }
    window.scrollTo(0, 0);
    var h1 = $('h1', main); if (h1) h1.focus({ preventScroll: true });
  });

  window.addEventListener('hashchange', router);
  router();
})();
