/* Prototype du site d'Armel Promeneur (V6) — JavaScript sans framework ni bibliothèque.
   V6 (téléphone et tablette seulement) : la rangée de l'accueil devient un tapis roulant continu (l'œuvre du milieu
   en grand, un bout des voisines), en-tête à fond plein. V5 : photos en fondu une fois décodées, plus de dévoilement
   par clip-path ni de glissement d'indice. L'ordinateur ne change pas.
   Routage par hash (#/galerie, #/oeuvre/07…), marche aussi ouvert en file://.
   Les données viennent de data.js (window.SITE). Rien n'est envoyé sur internet.
   Mouvement : seulement transform, opacity et clip-path ; tout est coupé si prefers-reduced-motion. */
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

  /* Fiche : vues simulées (détail, signature, échelle), faites avec la photo de l'œuvre en attendant
     les vraies photos ; le cartouche le dit toujours. Zone agrandie (x y) par œuvre, sinon le centre
     pour le détail et le coin bas droit pour la signature. */
  var SIM_DETAIL = { '02': '62% 55%', '07': '38% 40%', '08': '45% 60%' };
  var SIM_SIGNATURE = { '01': '88% 90%', '02': '4% 96%', '07': '0% 100%', '09': '76% 93%', '10': '72% 95%', '15': '37% 79%' };
  var SIM_TXT = {
    detail: { court: '[Détail]', note: 'sera remplacée par une vraie photo du détail' },
    signature: { lib: '[Photo de la signature]', court: '[Signature]', note: 'sera remplacée par une vraie photo de la signature' },
    echelle: { lib: '[Vue à l\'échelle, quand les dimensions seront connues]', court: '[Échelle]', note: 'sera remplacée par une vraie vue à l\'échelle' }
  };
  // Simulation : la vignette « Signature » ne reste que si sa découpe montre une vraie signature (SIM_SIGNATURE)
  // et que simulation.js ne la dit pas au dos ou sous la base ; sinon elle mentirait (légende « Signature » sur un coin vide)
  function sigCachee(o) { var e = simuO(o, 'edition') || ''; return !SIM_SIGNATURE[o.n] || /au dos|sous la base/.test(e); }
  function simPos(o, t) { return t === 'detail' ? (SIM_DETAIL[o.n] || '50% 45%') : (SIM_SIGNATURE[o.n] || '94% 94%'); }
  // Vignette : le cartouche se met du côté opposé à la zone agrandie (en bas d'habitude, en haut pour une signature en bas)
  function ctoHaut(o, t) { return t !== 'echelle' && parseFloat(simPos(o, t).split(' ')[1]) > 50; }
  function simHtml(o, t, grand) {
    var im = '<img src="' + (grand ? grande(o) : vignette(o)) + '" alt="" width="' + o.w + '" height="' + o.h + '" decoding="async">';
    if (t === 'echelle') return '<span class="sim sim-echelle" aria-hidden="true"><span class="sim-oe">' + im + '</span><span class="sim-sol"></span></span>';
    var pos = simPos(o, t);
    return '<span class="sim sim-zoom" aria-hidden="true" style="--pos:' + pos + ';--z:' + (t === 'detail' ? 3 : 3.5) + '">' + im + '</span>';
  }
  function cartouche(o, t, grand) {
    var x = SIM_TXT[t], lib = t === 'detail' ? '[Photo de détail ' + CAT_PLUS[o.cat].detail + ']' : x.lib;
    var note = '<b>Simulation</b>&#8239;: ' + x.note;
    var leg = '<span class="sv cto-sv">' + SIM_LEG[t] + '</span>'; // mode Simulation : légende propre
    if (grand) return '<p class="cto grand"><span class="cto-lib">' + lib + '</span><span class="cto-note">' + note + '</span>' + leg + '</p>';
    return '<span class="cto"><span class="cto-lib"><span class="d-only">' + lib + '</span><span class="m-only">' + x.court + '</span></span>' +
      '<span class="cto-note"><span class="d-only">' + note + '</span><span class="m-only"><b>Simulation</b></span></span>' + leg + '</span>';
  }

  // Œuvre montrée en grand dans la page À propos (une œuvre du catalogue, donc reliée à sa fiche)
  var OEUVRE_APROPOS = '08';

  // Mouvement des pages : deux courbes (entrée, interface) ; celles du carrousel sont dans styles.css (--ca-*, --e-ressort)
  var E_ENTREE = 'cubic-bezier(.22,1,.36,1)';
  var E_UI = 'cubic-bezier(.4,0,.2,1)';
  var DUREE_OEUVRE = 6000; // accueil sur ordinateur : 6 s par œuvre
  // Accueil sur téléphone et tablette : tapis roulant continu. VITESSE : une œuvre passe au milieu toutes les
  // DEFILE_TEL secondes (plus grand = plus lent). Le tapis repart REPRISE_TEL ms après le dernier geste.
  var DEFILE_TEL = 5.5;
  var REPRISE_TEL = 5000;

  var main = document.getElementById('contenu');
  var pied = document.getElementById('pied');
  var mqReduit = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mqOrdi = window.matchMedia('(min-width: 1024px)');
  function reduit() { return mqReduit.matches; }

  /* ---------- Petits outils ---------- */
  function noop() {}
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // Prix au format suisse : CHF 1'800.–
  function chf(v) { return 'CHF ' + String(v).replace(/\B(?=(\d{3})+(?!\d))/g, "'") + '.–'; }
  var EX = ' <span class="ex">exemple</span>'; // espace devant : « CHF 1'800.– exemple » aussi pour les lecteurs d'écran

  /* ---------- V7 : mode « Simulation » (pastille fixe en bas de l'écran) ----------
     Chaque emplacement à compléter rend DEUX versions côte à côte : l'annotation (.ph, .phl : entre crochets,
     bord en traitillé) et la valeur inventée (.sv), tirée de simulation.js (window.SIMU). La classe html.simu
     choisit en CSS laquelle s'affiche (.ex et .av disparaissent aussi). Valeur absente : l'annotation reste
     visible même en simulation (.reste), jamais « undefined ». */
  var SIMU = window.SIMU || {};
  var SIMU_O = SIMU.oeuvres || {};
  var SIMU_T = SIMU.textes || {};
  // Emplacements hors du schéma de simulation.js (À propos, impressum) : valeurs inventées ici, remplaçables
  // par une clé du même nom dans SIMU.textes. Chaîne vide = l'annotation disparaît sans rien à la place.
  var SIMU_CODE = {
    trait: 'Tout part d\'un trait noir, posé sans esquisse. Le visage vient d\'un seul geste, puis la couleur remplit les formes, en aplats francs.',
    collage: 'Tissus imprimés, papiers peints, pages de livres : Armel colle ce qu\'il trouve à même la peinture. Un motif devient une joue, un col, un fond.',
    bois: 'Les sculptures naissent de souches ramassées près de chez lui. Armel suit la forme du bois, creuse à la gouge, puis le peint ou le laisse brut.',
    auteurPhotos: '(photos : Armel Promeneur)',
    siVente: '',
    fraisLivraison: 'sont indiqués avant la commande',
    cgv: 'Les conditions de vente sont jointes à chaque confirmation de commande.',
    siVenteAchat: '(par le formulaire de contact)',
    moyenPaiement: 'Le paiement se fait par virement bancaire ou par TWINT.',
    cookiesVente: '',
    polices: 'Les polices d\'écriture sont hébergées sur le serveur du site.',
    hebergeur: '(en Suisse)',
    outilForm: '(en Suisse)',
    messagerie: '(en Suisse)',
    achatPrestataires: 'le prestataire de paiement et La Poste',
    siFactures: '',
    dateVersion: '1er novembre 2026'
  };
  // Légendes propres des vues simulées de la fiche (à la place du cartouche entre crochets)
  var SIM_LEG = { detail: 'Détail', signature: 'Signature', echelle: 'Vue à l\'échelle' };
  function simuO(o, k) { var x = o && SIMU_O[o.n]; return x && typeof x[k] === 'string' && x[k] ? x[k] : null; }
  function adressePd() { var a = simuT('adresse'), n = simuT('npaLocalite'); return a && n ? a + ', ' + n : a; }
  function titreAn(o) { var t = simuO(o, 'titre'), a = simuO(o, 'annee'); return t && a ? t + ', ' + a : t; }
  function simuT(k) {
    var v = SIMU_T[k];
    if (Array.isArray(v)) return v.length ? { h: v.map(esc).join('<br>') } : null;
    if (typeof v === 'string') return v;
    return SIMU_CODE[k] != null ? SIMU_CODE[k] : null;
  }
  // Annotation + valeur inventée. a : HTML de l'annotation ; v : texte (ou { h: HTML }), null = manque ;
  // cls : classes communes (d-only, l-y…) ; attr : attributs de la valeur (mise à jour en direct) ; k : 'ph' ou 'phl'
  function ph(a, v, cls, attr, k) {
    var c = cls ? ' ' + cls : '';
    return '<span class="' + (k || 'ph') + (v == null ? ' reste' : '') + c + '">' + a + '</span>' +
      '<span class="sv' + c + '"' + (attr || '') + '>' + (v == null ? '' : v.h != null ? v.h : esc(v)) + '</span>';
  }
  // Mise à jour en direct d'une valeur inventée (cartels de l'accueil, aperçu de l'index)
  function majSv(sv, v) {
    if (!sv) return;
    sv.textContent = v == null ? '' : v;
    if (sv.previousElementSibling) sv.previousElementSibling.classList.toggle('reste', v == null);
  }
  // Deux versions d'un petit bout de texte (ex. « les » / « Les » quand l'annotation qui précède disparaît)
  // Fins de phrase gardées entières dans les deux versions : couper le texte de la V6 décale les lettres d'un 64e de pixel
  var PRIX_TXT = ' prix sont indiqués en francs suisses (CHF) et sont les prix effectivement à payer&#8239;; les frais de livraison ';
  var FACT_TXT = ' factures et les pièces comptables sont conservées 10 ans, comme la loi l\'exige.';
  function deux(a, s) { return '<span class="av">' + a + '</span><span class="sv">' + s + '</span>'; }
  function simuOn() { return document.documentElement.classList.contains('simu'); }
  function libVendue() { return simuOn() ? ' (vendue)' : ' (vendue, exemple)'; }
  // Pastille rouge des œuvres vendues (seule couleur ajoutée ; le mot « Vendue » reste écrit en encre)
  var PASTILLE = '<span class="pastille" aria-hidden="true"></span>';
  function dispo(o) { return o.statut === 'disponible'; }
  function ratio(o) { return o.w / o.h; }
  function vignette(o) { return 'img/oeuvre-' + o.n + '-720.jpg'; }
  function grande(o) { return 'img/oeuvre-' + o.n + '.jpg'; }
  // Les deux tailles de chaque œuvre : le navigateur choisit selon la place et l'écran
  function srcset(o) { return vignette(o) + ' 720w, ' + grande(o) + ' ' + o.w + 'w'; }
  // Même taille que celle choisie pour l'image affichée (pour précharger les voisines utilement)
  function variante(o, img) { return img && /-720\.jpg$/.test(img.currentSrc || '') ? vignette(o) : grande(o); }
  // Appelle f quand l'image est chargée (tout de suite si c'est déjà fait)
  function quandCharge(img, f) {
    if (!img || img.complete) { f(); return; }
    img.addEventListener('load', f, { once: true });
    img.addEventListener('error', f, { once: true });
  }
  function alt(o) { return 'Armel Promeneur, ' + o.type.toLowerCase().replace(' · ', ', ') + ' (référence N° ' + o.n + ')'; }
  function prixCourt(o) { return dispo(o) ? chf(o.prix) + EX : PASTILLE + 'Vendue' + EX; }
  function statut(o) { return dispo(o) ? 'Disponible' + EX : PASTILLE + 'Vendue' + EX; }
  function rang(o) { return LISTE.indexOf(o); }
  function voisin(o, d) { return LISTE[(rang(o) + d + TOTAL) % TOTAL]; }
  function lienOeuvre(o) { return '#/oeuvre/' + o.n; }
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function attendre(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  // Titre découpé en lignes masquées (apparition ligne par ligne)
  function lignes(t) {
    return t.map(function (x, i) { return '<span class="l"><span style="--i:' + i + '">' + x + '</span></span>'; }).join(' ');
  }
  // Images préchargées et décodées (le changement d'œuvre attend l'image prête)
  var cacheImg = {};
  function decoder(url) {
    var i = cacheImg[url];
    if (!i) { i = cacheImg[url] = new Image(); i.src = url; }
    return i.decode ? i.decode().catch(noop) : Promise.resolve();
  }
  function dansFenetre(el) {
    var b = el.getBoundingClientRect();
    return b.width > 0 && b.bottom > 0 && b.top < window.innerHeight && b.right > 0 && b.left < window.innerWidth;
  }
  // Valeur d'une variable CSS en nombre (« 850ms » ou « .85s » rendent 850)
  function reglageCss(nom, el) {
    var v = getComputedStyle(el || document.documentElement).getPropertyValue(nom).trim(), x = parseFloat(v);
    return /\ds$/.test(v) ? x * 1000 : x;
  }
  // Logo Instagram (glyphe simple, couleur du texte), devant le nom du compte
  var IG_LOGO = '<svg class="ig-logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="5.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.4" cy="6.6" r="1.15" fill="currentColor"/></svg>';
  function lienInsta() { return '<a class="ig" href="' + INSTA + '" target="_blank" rel="noopener">' + IG_LOGO + '<span>@promeneur_armel_studio <span aria-hidden="true">↗</span></span></a>'; }
  // Flèche ronde (accueil et fiche) : trait fin de 1,5 px et onde qui part du bouton à l'appui
  function flecheIc(d) {
    return '<span class="fl-ic" aria-hidden="true"><svg width="20" height="14" viewBox="0 0 20 14"><path d="' + (d < 0 ? 'M19 7H1.5M7.5 1 1.5 7l6 6' : 'M1 7h17.5M12.5 1l6 6-6 6') + '" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
      '<span class="onde" aria-hidden="true"></span>';
  }
  // Onde qui part d'un bouton rond
  function onde(b) {
    var o = $('.onde', b);
    if (!o || !o.animate || reduit()) return;
    o.animate([{ transform: 'scale(.6)', opacity: reglageCss('--onde-op') }, { transform: 'scale(1.6)', opacity: 0 }],
      { duration: reglageCss('--onde-duree'), easing: 'cubic-bezier(.25,.6,.4,1)' });
  }
  /* Boutons : enfoncement à l'appui (souris, doigt, Entrée/Espace), retour avec rebond (CSS), onde au clic.
     ecoute(cible, type, f) permet au carrousel de tout débrancher en quittant la page. */
  function appui(b, avecOnde, ecoute) {
    ecoute = ecoute || function (c, t, f) { c.addEventListener(t, f); };
    var oui = function () { b.classList.add('appuye'); };
    var non = function () { b.classList.remove('appuye'); };
    ecoute(b, 'pointerdown', function (e) { if (e.button === 0) oui(); });
    ['pointerup', 'pointercancel', 'pointerleave', 'blur', 'keyup'].forEach(function (t) { ecoute(b, t, non); });
    ecoute(b, 'keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') oui(); });
    if (avecOnde) ecoute(b, 'click', function () { onde(b); });
  }

  /* ---------- Cartes et rangées justifiées ---------- */
  function carte(o, opts) {
    opts = opts || {};
    var r = ratio(o);
    var style = opts.flex ? ' style="flex:' + (r * 100).toFixed(2) + ' 1 ' + (r * 250).toFixed(1) + 'px"' : '';
    var prix = opts.prix ? '<span class="carte-prix">' + prixCourt(o) + '</span>' : '';
    return '<a class="carte" href="' + lienOeuvre(o) + '"' + style + (opts.rv ? ' data-rv' : '') + '>' +
      '<span class="carte-hd mono">' + esc(o.type) + '</span>' +
      '<span class="carte-im"><img src="' + vignette(o) + '" alt="' + esc(alt(o)) + '" width="' + o.w + '" height="' + o.h + '" ' + (opts.eager ? 'fetchpriority="high"' : 'loading="lazy"') + ' decoding="async" style="aspect-ratio:' + o.w + ' / ' + o.h + '"></span>' +
      '<span class="carte-lg">' + ph('[Titre, année]', titreAn(o)) + prix + '</span></a>';
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
        return carte(o, { flex: true, prix: b.opts.prix, rv: b.opts.rv, eager: b.opts.eager1 && i === 0 });
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
      preparerImages(b.el); // téléphone : les nouvelles photos apparaissent en fondu, elles aussi
      var c5 = $$('a.carte', b.el)[4];
      if (c5) c5.focus({ preventScroll: true });
    });
  }
  var galerieDepliee = false; // retenu pendant la visite (retour depuis une fiche : la liste reste dépliée)
  function nGalerie(w) { return w >= 1100 ? 4 : w >= 820 ? 3 : w >= 560 ? 2 : 1; }
  function nChoisies(w) { return w >= 760 ? 4 : w >= 560 ? 2 : 1; }
  function nAutres(w) { return w >= 640 ? 4 : 0; }

  /* ---------- Pied de page légal : petit, gris, en mono ---------- */
  function piedHtml() {
    return '<div class="ft mono"><span>Armel Promeneur © 2026</span>' +
      '<span class="ft-liens"><a href="#/contact">Contact</a> · <a href="' + INSTA + '" target="_blank" rel="noopener">Instagram</a> · ' +
      '<a href="#/impressum">Impressum</a> · <a href="#/impressum/protection-donnees"><span class="d-only">Protection des données</span><span class="m-only">Données</span></a></span></div>';
  }

  /* ---------- Bloc d'appel « Une œuvre vous intéresse ? » (avant le pied de page) ---------- */
  var DEMANDES = {
    acheter: { lib: 'Acheter cette œuvre', msg: 'Bonjour Armel, je souhaite acheter cette œuvre.' },
    infos: { lib: 'Demande d\'informations', msg: 'Bonjour Armel, j\'aimerais en savoir plus sur cette œuvre.' },
    semblable: { lib: 'Une œuvre semblable', msg: 'Bonjour Armel, cette œuvre est vendue. Auriez-vous une œuvre semblable\u202F?' }
  };

  function appelHtml(v) {
    var grand = !!v.page; // page Contact : le bloc en grand, avec les autres moyens de contact
    var nSel = v.oeuvre && PAR_N[v.oeuvre] ? v.oeuvre : '';
    var options = '<option value=""' + (nSel ? '' : ' selected') + '>Aucune en particulier</option>' +
      LISTE.map(function (o) {
        return '<option value="' + o.n + '"' + (o.n === nSel ? ' selected' : '') + (dispo(o) ? '>' : ' data-vendue>') + 'N° ' + o.n + ' · ' + esc(o.type) + (dispo(o) ? '' : libVendue()) + '</option>';
      }).join('');
    var titre = grand
      ? '<h1 class="appel-t" id="appel-titre" tabindex="-1" data-rv="lignes">' + lignes(['Contact']) + '</h1>' +
        '<p class="appel-lead">Une œuvre vous intéresse&#8239;? Une question&#8239;? <span class="nw">Écrivez à Armel.</span></p>'
      : '<h2 class="appel-t" id="appel-titre" data-rv="lignes">' + lignes(['Une œuvre', 'vous intéresse&#8239;?']) + '</h2>';
    var moyens = grand
      ? '<dl class="ct-dl">' +
          '<div><dt class="mono">E-mail</dt><dd>' + ph('[adresse à fournir]', simuT('email')) + '</dd></div>' +
          '<div><dt class="mono">Instagram</dt><dd>' + lienInsta() + '</dd></div>' +
          '<div><dt class="mono">Lieu</dt><dd>En Suisse, ' + ph('[ville]', simuT('ville')) + '</dd></div>' +
        '</dl>'
      : '<p class="appel-insta"><span class="mono">Instagram</span>' + lienInsta() + '</p>';
    var err = function (id) { return '<span class="err" id="' + id + '-err" hidden></span>'; };
    return '<section class="appel' + (grand ? ' grand' : '') + '" id="appel" aria-labelledby="appel-titre"><div class="appel-in">' +
      '<div class="appel-g">' + titre +
        '<div class="appel-armel"><img src="img/portrait-armel-2.jpg" alt="Armel Promeneur" width="900" height="1010"' + (grand ? '' : ' loading="lazy"') + ' decoding="async" data-rv="clip">' +
          '<div><blockquote class="appel-cit"><p>«&#8239;' + ph('[Une phrase d\'Armel aux visiteurs, à fournir]', simuT('appelCitation')) + '&#8239;»</p></blockquote>' +
          '<p class="mono appel-sig">Armel Promeneur</p></div></div>' +
        moyens +
      '</div>' +
      '<div class="appel-d">' +
        '<form class="form" id="form" action="#" novalidate aria-label="Écrire à Armel">' +
          '<div class="form-g">' +
            '<div class="chp"><label for="c-nom" class="mono">Nom *</label><input id="c-nom" name="nom" type="text" autocomplete="name" required placeholder="Prénom et nom" aria-describedby="c-nom-err">' + err('c-nom') + '</div>' +
            '<div class="chp"><label for="c-mail" class="mono">E-mail *</label><input id="c-mail" name="email" type="email" autocomplete="email" required placeholder="nom@exemple.ch" aria-describedby="c-mail-err">' + err('c-mail') + '</div>' +
            '<div class="chp plein"><label for="c-oeuvre" class="mono">Œuvre</label><select id="c-oeuvre" name="oeuvre">' + options + '</select></div>' +
            '<div class="chp plein"><label for="c-msg" class="mono">Message *</label><textarea id="c-msg" name="message" rows="' + (grand ? 6 : 4) + '" required placeholder="Votre message" aria-describedby="c-msg-err"></textarea>' + err('c-msg') + '</div>' +
          '</div>' +
          '<input type="hidden" name="souhait" id="c-souhait" value="">' +
          '<div class="form-env">' +
            '<button type="submit" class="btn-env">Écrire à Armel <span aria-hidden="true">→</span></button>' +
            '<p class="ct-note"><span class="mono">* obligatoire.</span> Vos données servent uniquement à répondre à votre message (<a href="#/impressum/protection-donnees">protection des données</a>).</p>' +
          '</div>' +
        '</form>' +
        '<div class="merci" id="merci" hidden></div>' +
      '</div>' +
    '</div></section>';
  }

  // Formulaire du bloc d'appel : vérification, envoi SIMULÉ (aucun appel réseau)
  var form$ = null; // accès au formulaire de la page en cours
  function brancherFormulaire(v) {
    var form = $('#form', main), merci = $('#merci', main);
    if (!form) { form$ = null; return; }
    var nom = $('#c-nom', form), mail = $('#c-mail', form), sel = $('#c-oeuvre', form), msg = $('#c-msg', form), souhait = $('#c-souhait', form);
    var regles = [
      [nom, function (x) { return x.trim() ? '' : 'Indiquez votre nom.'; }],
      [mail, function (x) {
        x = x.trim();
        if (!x) return 'Indiquez votre adresse e-mail.';
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(x) ? '' : 'Cette adresse e-mail ne semble pas complète (exemple\u202F: nom@exemple.ch).';
      }],
      [msg, function (x) { return x.trim() ? '' : 'Écrivez votre message.'; }]
    ];
    function montrer(champ, texte) {
      var e = document.getElementById(champ.id + '-err');
      e.textContent = texte; e.hidden = !texte;
      if (texte) champ.setAttribute('aria-invalid', 'true'); else champ.removeAttribute('aria-invalid');
    }
    function reinitialiser() {
      form.reset();
      regles.forEach(function (rg) { montrer(rg[0], ''); });
      merci.hidden = true; merci.innerHTML = ''; form.hidden = false;
    }
    // Préremplit l'œuvre et l'intention ; le message n'écrase jamais un texte déjà tapé
    var dernierMsg = '';
    function preremplir(n, d) {
      if (form.hidden) reinitialiser();
      if (n && PAR_N[n]) sel.value = n;
      if (DEMANDES[d]) {
        souhait.value = d;
        if (!msg.value.trim() || msg.value === dernierMsg) { msg.value = dernierMsg = DEMANDES[d].msg + ' '; }
      }
    }
    regles.forEach(function (rg) {
      rg[0].addEventListener('input', function () { if (rg[0].getAttribute('aria-invalid')) montrer(rg[0], rg[1](rg[0].value)); });
    });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var premier = null;
      regles.forEach(function (rg) { var t = rg[1](rg[0].value); montrer(rg[0], t); if (t && !premier) premier = rg[0]; });
      if (premier) { premier.focus(); return; }
      // Prototype : AUCUN envoi réseau, on affiche seulement un résumé
      var lignesM = [
        ['Nom', nom.value.trim()], ['E-mail', mail.value.trim()],
        ['Œuvre', sel.options[sel.selectedIndex].text],
        DEMANDES[souhait.value] ? ['Demande', DEMANDES[souhait.value].lib] : null,
        ['Message', msg.value.trim()]
      ].filter(Boolean);
      merci.innerHTML = '<div class="merci-boite" role="status">' +
        '<h3 tabindex="-1">Merci&#8239;!</h3>' +
        '<p class="merci-txt">Sur le vrai site, ce message partirait chez Armel. Ici, c\'est un prototype&#8239;: rien n\'a été envoyé.</p>' +
        '<dl class="merci-dl">' + lignesM.map(function (l) { return '<div><dt class="mono">' + l[0] + '</dt><dd>' + esc(l[1]) + '</dd></div>'; }).join('') + '</dl>' +
        '<button type="button" class="btn btn-ligne" id="encore">Écrire un autre message <span aria-hidden="true">→</span></button></div>';
      form.hidden = true; merci.hidden = false;
      $('h3', merci).focus();
      $('#encore', merci).addEventListener('click', function () { reinitialiser(); nom.focus(); });
    });
    if (v && (v.oeuvre || v.demande)) preremplir(v.oeuvre, v.demande);
    form$ = {
      preremplir: preremplir,
      // Fiche œuvre : formulaire prérempli. Ordinateur : défile jusqu'au bloc, focus sur « Nom ».
      // Sous 1024 px (bloc empilé) : défile droit au formulaire, sous l'en-tête collé.
      // Écran tactile : pas de focus, sinon le clavier de l'iPhone s'ouvre et cache le formulaire.
      ouvrir: function (n, d) {
        preremplir(n, d);
        var comp = { behavior: reduit() ? 'auto' : 'smooth' };
        if (window.innerWidth < 1024) {
          var hd = $('.hd'), haut = hd ? hd.getBoundingClientRect().height : 0;
          comp.top = Math.max(0, form.getBoundingClientRect().top + window.scrollY - haut - 16);
          window.scrollTo(comp);
        } else {
          comp.block = 'start';
          $('#appel', main).scrollIntoView(comp);
        }
        if (!window.matchMedia('(pointer: coarse)').matches) nom.focus({ preventScroll: true });
      },
      valeurs: function () { return { nom: nom.value, mail: mail.value, oeuvre: sel.value, msg: msg.value, souhait: souhait.value, envoye: form.hidden }; },
      remettre: function (x) { if (x.envoye) return; nom.value = x.nom; mail.value = x.mail; sel.value = x.oeuvre; msg.value = x.msg; souhait.value = x.souhait; }
    };
  }

  /* ---------- Page : accueil ---------- */
  var heros = null;        // œuvre affichée dans le héros (retenue pendant la visite)
  var carArret = false;    // défilement automatique arrêté pour de bon (premier geste ou tour complet)
  var car = null;         // carrousel de la page en cours
  var pauseManuelle = false; // Pause mise à la main : gardée pendant la visite (retour sur l'accueil compris)
  var retourTel = false;     // téléphone : on revient d'une fiche (le tapis attend avant de repartir)
  var focusScript = false;   // focus posé par le routeur (retour d'une fiche) : ni clavier ni lecteur d'écran

  function pageAccueil() {
    var o = heros || PAR_N[SITE.phare] || LISTE[0];
    heros = o;
    var choisies = SITE.choisies.map(function (n) { return PAR_N[n]; }).filter(Boolean);
    // Rangée du téléphone : à partir de l'œuvre du héros
    var rangee = [];
    for (var k = 0; k < TOTAL; k++) rangee.push(voisin(o, k));
    var nomH1 = '<span class="hero-nom">' + lignes(['Armel', 'Promeneur']) + '</span> ' +
      '<span class="hero-sous"><span class="l"><span style="--i:2">Peintre et sculpteur</span></span></span>';
    var html =
      '<section class="hero" aria-roledescription="carrousel" aria-label="Œuvres à la une"><div class="hero-in">' +
        '<div class="hero-g">' +
          // Le nom apparaît ligne par ligne, au premier chargement seulement
          '<h1 class="hero-h1" tabindex="-1"' + (premiere ? ' data-rv="lignes"' : '') + '>' + nomH1 + '</h1>' +
          '<nav class="hero-nav" aria-label="Navigation principale">' +
            '<a href="#/galerie">Galerie</a>' +
            '<a href="#/a-propos">À propos</a>' +
            '<a href="#/contact">Contact</a>' +
            '<a href="' + INSTA + '" target="_blank" rel="noopener">Instagram<span class="vh"> (nouvel onglet)</span></a>' +
          '</nav>' +
        '</div>' +
        '<div class="hero-c">' +
          '<div class="scene">' +
            // Les œuvres (centrale, voisines, entrantes) sont posées ici par brancherCarrousel()
            '<div class="scene-in" data-h="zone"><div class="ca" data-h="ca"></div></div>' +
            '<button type="button" class="fleche fleche-p" data-h="prec" aria-label="Œuvre précédente">' + flecheIc(-1) + '</button>' +
            '<button type="button" class="fleche fleche-s" data-h="suiv" aria-label="Œuvre suivante">' + flecheIc(1) + '</button>' +
            '<div class="hero-ctl" data-h="ctl">' +
              '<button type="button" class="pause" data-h="pause" data-etat="lecture"><span class="pause-ic" aria-hidden="true"></span><span data-h="pause-t">Pause</span></button>' +
              '<span class="piste" aria-hidden="true"><span class="piste-r" data-h="rempli"></span></span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="hero-d">' +
          '<a class="hero-tout" href="#/galerie">Voir les ' + TOTAL + ' œuvres <span aria-hidden="true">→</span></a>' +
          '<div class="cartel" aria-live="polite">' +
            '<p class="cart-titre">' + ph('[Titre à fournir]', simuO(o, 'titre'), '', ' data-h="titre"') + '</p>' +
            '<p class="cart-type"><span data-h="type">' + esc(o.type) + '</span> · ' + ph('[année]', simuO(o, 'annee'), '', ' data-h="annee"') + '</p>' +
            '<p class="cart-statut" data-h="statut">' + statut(o) + '</p>' +
            '<a class="cart-voir" data-h="voir" href="' + lienOeuvre(o) + '"><span>Voir l\'œuvre</span> <span aria-hidden="true">→</span></a>' +
          '</div>' +
        '</div>' +
        // Téléphone et tablette (V6) : tapis roulant. Une seule copie de la liste, à partir de l'œuvre du héros ;
        // les œuvres sont posées et déplacées par brancherCarrousel(). Images de 720 px (assez pour un téléphone),
        // emplacement à la largeur de l'œuvre (--r = largeur / hauteur).
        '<div class="hero-m">' +
          '<div class="rangee" role="group" aria-label="Œuvres à la une&#8239;: faites glisser pour en voir d\'autres">' +
            rangee.map(function (x, i) {
              return '<a class="r-it" href="' + lienOeuvre(x) + '" data-n="' + x.n + '" style="--r:' + ratio(x).toFixed(4) + '">' +
                '<span class="r-cad"><img src="' + vignette(x) + '" alt="' + esc(alt(x)) + '" width="' + x.w + '" height="' + x.h + '"' +
                // (lazy partout : sur l'ordinateur la rangée est cachée et ne charge rien ; pas de decoding="async",
                //  l'image est déjà décodée quand on la montre)
                (i === 0 ? ' fetchpriority="high"' : '') + ' loading="lazy"></span></a>';
            }).join('') +
          '</div>' +
          '<div class="r-barre" aria-hidden="true"><span class="r-pos" style="width:calc(100% / ' + TOTAL + ');--nb:' + TOTAL + '"></span></div>' +
          '<div class="cartel-m" aria-live="polite">' +
            '<p class="cart-titre-m">' + ph('[Titre à fournir]', simuO(o, 'titre'), '', ' data-m="titre"') + ' <span class="an">' + ph('[année]', simuO(o, 'annee'), '', ' data-m="annee"') + '</span></p>' +
            '<p class="cart-ligne"><span><span data-m="type">' + esc(o.type) + '</span> · <span data-m="statut">' + statut(o) + '</span></span>' +
              '<a class="cart-voir" data-m="voir" href="' + lienOeuvre(o) + '"><span>Voir l\'œuvre</span> <span aria-hidden="true">→</span></a></p>' +
          '</div>' +
          '<a class="btn-gal" href="#/galerie">Voir les ' + TOTAL + ' œuvres <span aria-hidden="true">→</span></a>' +
        '</div>' +
      '</div></section>' +

      // Présentation : portrait, texte, bois travaillé dehors (le haut du titre dépasse sous le héros)
      '<section class="pres" aria-labelledby="presentation">' +
        '<h2 id="presentation">Des visages au trait noir, <span class="nw">la couleur</span> posée en collage, <span class="nw">le bois</span> des souches. <span class="ex">texte d\'exemple</span></h2>' +
        '<div class="pres-g">' +
          '<figure class="pres-portrait"><img src="img/portrait-armel.jpg" alt="Portrait d\'Armel Promeneur, chapeau et lunettes rondes" width="1110" height="1110" loading="lazy" decoding="async" data-rv="clip"></figure>' +
          '<div class="pres-c">' +
            '<p class="pres-acc">' + ph('[accroche provisoire, à valider avec Armel]', simuT('presAccroche')) + '</p>' +
            '<p class="pres-txt">' + ph('[Deux ou trois phrases de présentation, à écrire avec Armel&#8239;: son parcours, ses techniques, ce qui le guide.]', simuT('presTexte'), 'd-only') +
              ph('[Deux ou trois phrases de présentation, à écrire avec Armel.]', simuT('presTexteCourt') != null ? simuT('presTexteCourt') : simuT('presTexte'), 'm-only') + '</p>' +
            '<a class="lien-s pres-lien" href="#/a-propos">Découvrir Armel <span aria-hidden="true">→</span></a>' +
            '<dl class="faits">' +
              '<div><dt class="mono">Pratique</dt><dd>Peinture, collage, sculpture, dessin</dd></div>' +
              '<div><dt class="mono">Origine</dt><dd>Guadeloupe</dd></div>' +
              '<div><dt class="mono">Vit et travaille</dt><dd>En Suisse, ' + ph('[ville]', simuT('ville')) + '</dd></div>' +
              '<div><dt class="mono">Expositions</dt><dd>Pop-up Pepeuf, Markthalle Basel, juin 2026</dd></div>' +
            '</dl>' +
          '</div>' +
          '<figure class="pres-bois"><img src="img/atelier-bois.jpg" alt="Armel Promeneur travaillant le bois dehors, dans un jardin" width="1080" height="1080" loading="lazy" decoding="async" data-rv="clip"></figure>' +
        '</div>' +
      '</section>' +

      '<section class="sel" aria-labelledby="selection">' +
        '<div class="sec-hd"><h2 id="selection" data-rv>Œuvres choisies</h2>' +
          '<div class="sec-hd-r"><span class="mono d-only">' + choisies.length + ' œuvres sur ' + TOTAL + '</span><span class="mono m-only">' + choisies.length + ' sur ' + TOTAL + '</span>' +
          '<a class="lien-s d-only" href="#/galerie">Toute la galerie →</a></div></div>' +
        '<div class="justif serre" id="choisies"></div>' +
        '<a class="btn-gal m-only" href="#/galerie">Toute la galerie (' + TOTAL + ') <span aria-hidden="true">→</span></a>' +
      '</section>';

    return {
      html: html, titre: 'Armel Promeneur — Peintre et sculpteur', nav: '', appel: {},
      apres: function () {
        justifier($('#choisies'), choisies, nChoisies, { rv: true });
        car = brancherCarrousel();
      },
      quitter: function () { if (car) car.quitter(); car = null; }
    };
  }

  /* ---------- Carrousel de l'accueil ----------
     Ordinateur : carrousel COULISSANT. Les œuvres sont de vrais éléments, gardés par numéro (n-2 à n+2),
     posés en absolu dans la scène et déplacés seulement par transform (translateX + scale) et opacity.
     Les transitions CSS se reprennent d'où elles sont : un clic pendant un mouvement repart sans saut.
     Réglages (durées, courbes, échelles, opacités) : variables --ca-*, --cartel-*, --fl-* en tête de styles.css.
     Téléphone et tablette : tapis roulant continu (plus bas). */
  function brancherCarrousel() {
    var hero = $('.hero', main);
    var sc = $('.scene', hero), cartel = $('.cartel', hero), ctl = $('[data-h="ctl"]', hero);
    var zone = $('[data-h="zone"]', hero), ca = $('[data-h="ca"]', hero);
    var rempli = $('[data-h="rempli"]', hero), btn = $('[data-h="pause"]', hero), btnT = $('[data-h="pause-t"]', hero);
    var st = { anim: null, manuel: pauseManuelle, survol: false, focus: false, horsVue: false, pas: 0 };
    var quitte = false;
    var nettoyage = [];
    function ecoute(cible, type, f, opt) {
      if (!cible || !cible.addEventListener) return;
      cible.addEventListener(type, f, opt);
      nettoyage.push(function () { cible.removeEventListener(type, f, opt); });
    }
    function reglage(nom) { return reglageCss(nom, sc); }

    /* --- Ordinateur : les œuvres de la scène --- */
    var FEN = 2;      // œuvres gardées de chaque côté (les places ±2 sont invisibles)
    var els = {};     // élément de chaque œuvre, par numéro
    var departs = {}; // œuvres sorties de la fenêtre : retirées une fois leur mouvement fini
    // Décalage d'une œuvre par rapport à l'œuvre centrale (−12 à +11, la liste tourne en rond)
    function decal(o) { var d = (rang(o) - rang(heros) + TOTAL) % TOTAL; return d > TOTAL / 2 ? d - TOTAL : d; }
    function creer(o) {
      var a = document.createElement('a');
      a.className = 'ca-it neuf';
      a.href = lienOeuvre(o);
      a.setAttribute('data-n', o.n);
      a.innerHTML = '<span class="ca-in"><img src="' + vignette(o) + '" srcset="' + srcset(o) + '" sizes="474px" alt="" width="' + o.w + '" height="' + o.h + '"' +
        (o === heros ? ' fetchpriority="high"' : ' decoding="async" fetchpriority="low"') + '></span>';
      els[o.n] = a;
      ca.appendChild(a);
    }
    function imgDe(o) { return els[o.n] ? els[o.n].querySelector('img') : null; }
    // Garde n-2 à n+2 ; celles qui sortent sont retirées après leur mouvement (invisibles à ce moment-là)
    function fenetre() {
      for (var k = -FEN; k <= FEN; k++) {
        var o = voisin(heros, k);
        if (!els[o.n]) creer(o);
        if (departs[o.n]) { clearTimeout(departs[o.n]); delete departs[o.n]; }
      }
      Object.keys(els).forEach(function (n) {
        if (Math.abs(decal(PAR_N[n])) <= FEN || departs[n]) return;
        departs[n] = setTimeout(function () {
          delete departs[n];
          if (els[n] && Math.abs(decal(PAR_N[n])) > FEN) { els[n].remove(); delete els[n]; }
        }, reglage('--ca-duree') + 100);
      });
    }
    // Places calculées d'après les proportions de chaque œuvre : centrale à sa taille, voisines à au plus
    // 80 % de sa hauteur, un écart constant entre deux œuvres (aucun chevauchement, même en mouvement)
    function placer() {
      var S = zone.clientWidth, hh = zone.clientHeight;
      if (!S || !hh) return;
      // Plafond de l'œuvre centrale : sur une scène étroite (1024 px), plus de place pour les voisines
      var cap = Math.min(474, S - (S < 640 ? 330 : 290)), ecart = reglage('--ca-ecart'), op = reglage('--ca-vois-op');
      var taille = function (o) { var w = Math.min(cap, hh * ratio(o)); return { w: w, h: w / ratio(o) }; };
      var tc = taille(heros);
      var hv = Math.min(hh * reglage('--ca-vois-h'), tc.h * reglage('--ca-vois-max'));
      var ks = Object.keys(els).map(function (n) { return decal(PAR_N[n]); });
      var kmin = Math.min.apply(null, ks.concat(-FEN)), kmax = Math.max.apply(null, ks.concat(FEN));
      var pos = { 0: { x: 0, s: 1, t: tc } };
      var suite = function (k, sens) {
        var t = taille(voisin(heros, k)), s = hv / t.h, p = pos[k - sens];
        pos[k] = { x: p.x + sens * (p.t.w * p.s / 2 + ecart + t.w * s / 2), s: s, t: t };
      };
      for (var k = 1; k <= kmax; k++) suite(k, 1);
      for (k = -1; k >= kmin; k--) suite(k, -1);
      sc.style.setProperty('--ca-cap', cap.toFixed(1) + 'px'); // les flèches se centrent sur la partie visible des voisines
      // Positions en cours (clic pendant un mouvement) : une œuvre neuve part de là où est sa voisine intérieure
      var cur = {};
      Object.keys(els).forEach(function (n) {
        if (els[n].classList.contains('neuf') || !els[n].style.transform || !window.DOMMatrix) return;
        cur[n] = new DOMMatrix(getComputedStyle(els[n]).transform).e;
      });
      var cibles = [];
      Object.keys(els).forEach(function (n) {
        var el = els[n], o = PAR_N[n], d = decal(o), p = pos[d], a = Math.abs(d), img = el.querySelector('img');
        el.style.width = p.t.w.toFixed(1) + 'px';
        el.style.height = p.t.h.toFixed(1) + 'px';
        el.style.marginLeft = (-p.t.w / 2).toFixed(1) + 'px';
        el.style.marginTop = (-p.t.h / 2).toFixed(1) + 'px';
        var cible = 'translate3d(' + p.x.toFixed(1) + 'px,0,0) scale(' + p.s.toFixed(4) + ')';
        var j = d - Math.sign(d), c = a >= 2 && pos[j] ? cur[voisin(heros, j).n] : null;
        if (el.classList.contains('neuf') && c != null && !el.style.transform) {
          // Posée (invisible) dans le prolongement de sa voisine intérieure, puis elle glisse avec elle
          el.style.transform = 'translate3d(' + (c + p.x - pos[j].x).toFixed(1) + 'px,0,0) scale(' + p.s.toFixed(4) + ')';
          cibles.push([el, cible]);
        } else el.style.transform = cible;
        el.style.opacity = a === 0 ? '1' : a === 1 ? String(op) : '0';
        el.classList.toggle('centre', a === 0);
        el.classList.toggle('vois', a === 1);
        el.classList.toggle('loin', a > 1);
        // Seule l'œuvre centrale est un lien lu et atteint au clavier (les voisines doublent les flèches)
        if (a === 0) { el.removeAttribute('tabindex'); el.removeAttribute('aria-hidden'); img.alt = alt(o); }
        else { el.tabIndex = -1; el.setAttribute('aria-hidden', 'true'); img.alt = ''; }
        img.sizes = Math.round(p.t.w) + 'px';
      });
      // Les œuvres neuves (ou après un redimensionnement) se posent sans mouvement
      if ($('.neuf', ca)) {
        void ca.offsetWidth;
        $$('.neuf', ca).forEach(function (el) { el.classList.remove('neuf'); });
        if (cibles.length) { void ca.offsetWidth; cibles.forEach(function (x) { x[0].style.transform = x[1]; }); }
      }
    }
    function precharger() {
      var im = imgDe(heros);
      [-3, 3].forEach(function (k) { decoder(variante(voisin(heros, k), im)); });
    }
    function construire() {
      if (!mqOrdi.matches || ca.firstChild) return;
      fenetre();
      placer();
      ecrireCartel();
      quandCharge(imgDe(heros), precharger);
    }
    // Passe à l'œuvre voisine (dir = −1 ou 1)
    var debut = -1e9, repriseT = 0, file = [], fileT = 0;
    function aller(dir) {
      if (!ca.firstChild) return;
      // Clic pendant un mouvement : repart de la position en cours avec une courbe sans départ lent
      var maintenant = performance.now(), duree = reglage('--ca-duree');
      if (maintenant - debut < duree) {
        ca.classList.add('reprise');
        clearTimeout(repriseT);
        repriseT = setTimeout(function () { ca.classList.remove('reprise'); }, duree + 50);
      }
      debut = maintenant;
      var focusDedans = ca.contains(document.activeElement);
      heros = voisin(heros, dir);
      fenetre();
      placer();
      if (focusDedans) els[heros.n].focus({ preventScroll: true });
      cartelVers();
      precharger();
    }

    /* --- Cartel : sortie vers le haut, puis entrée de 12 px, juste après le début du mouvement --- */
    function ecrireCartel() {
      $$('[data-h="voir"]', hero).forEach(function (a) { a.href = lienOeuvre(heros); });
      $('[data-h="type"]', hero).textContent = heros.type;
      $('[data-h="statut"]', hero).innerHTML = statut(heros);
      majSv($('[data-h="titre"]', hero), simuO(heros, 'titre'));
      majSv($('[data-h="annee"]', hero), simuO(heros, 'annee'));
    }
    var cartAn = [], cartJeton = 0;
    function cartelVers() {
      var parts = $$('.cart-titre, .cart-type, .cart-statut, .cart-voir', cartel);
      var jeton = ++cartJeton;
      if (reduit() || !cartel.animate) { ecrireCartel(); return; }
      var delai = reglage('--cartel-delai'), so = reglage('--cartel-sortie'), en = reglage('--cartel-entree'), dy = reglage('--cartel-dy'), pas = 40;
      // Repart de l'état où se trouve le cartel (clic pendant un changement)
      cartAn.forEach(function (a) {
        if (a.playState !== 'finished') { try { a.commitStyles(); } catch (e) { /* rien */ } }
        a.cancel();
      });
      cartAn = parts.map(function (el, i) {
        return el.animate([{ opacity: 0, transform: 'translateY(' + (-dy / 2) + 'px)' }],
          { duration: so, delay: delai + i * pas, easing: 'cubic-bezier(.4,0,1,1)', fill: 'both' });
      });
      // Quand la dernière ligne est sortie : nouveau texte, puis entrée ligne par ligne
      cartAn[cartAn.length - 1].finished.then(function () {
        if (jeton !== cartJeton || quitte) return;
        ecrireCartel();
        cartAn.forEach(function (a) { a.cancel(); });
        cartAn = parts.map(function (el, i) {
          el.style.opacity = ''; el.style.transform = '';
          return el.animate([{ opacity: 0, transform: 'translateY(' + dy + 'px)' }, { opacity: 1, transform: 'none' }],
            { duration: en, delay: i * pas, easing: E_ENTREE, fill: 'backwards' });
        });
      }, noop);
    }

    function autoPossible() { return mqOrdi.matches && !reduit(); }
    function enPause() { return st.manuel || st.survol || st.focus || st.horsVue || document.hidden || !autoPossible(); }
    function majBouton() {
      var joue = !carArret && !st.manuel;
      btn.setAttribute('data-etat', joue ? 'lecture' : 'pause');
      btnT.textContent = joue ? 'Pause' : 'Lecture';
      btn.setAttribute('aria-label', joue ? 'Pause du défilement des œuvres' : 'Lecture du défilement des œuvres');
      ctl.hidden = reduit();
      // Pendant le défilement automatique, le cartel ne parle pas à chaque œuvre
      cartel.setAttribute('aria-live', st.anim && !enPause() ? 'off' : 'polite');
    }
    function appliquer() {
      if (st.anim) { if (enPause()) st.anim.pause(); else st.anim.play(); }
      majBouton();
    }
    function lancer() {
      if (st.anim) st.anim.cancel();
      st.anim = null;
      if (carArret || reduit() || !rempli.animate) { majBouton(); return; }
      // La barre se remplit en 6 s (linéaire) ; à la fin, œuvre suivante
      st.anim = rempli.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: DUREE_OEUVRE, easing: 'linear', fill: 'forwards' });
      st.anim.onfinish = function () {
        st.pas++;
        if (st.pas >= TOTAL) { aller(1); arreter(); return; } // tour complet : arrêt
        // L'œuvre suivante glisse quand son image est prête, et la barre repart avec elle
        var im = imgDe(voisin(heros, 1));
        Promise.resolve(im && im.decode ? im.decode().catch(noop) : null).then(function () {
          if (quitte || carArret) return;
          aller(1);
          lancer();
        });
      };
      appliquer();
    }
    function arreter() {
      carArret = true;
      if (st.anim) st.anim.cancel();
      st.anim = null;
      majBouton();
    }
    // Clics rapides : un geste qui arrive avant 40 % du mouvement en cours attend ce moment (au plus 2 en file)
    function jouerFile() {
      fileT = 0;
      if (quitte || !file.length) return;
      aller(file.shift());
      if (file.length) fileT = setTimeout(jouerFile, reglage('--ca-duree') * .4);
    }
    function geste(dir) {
      arreter();
      var reste = debut + reglage('--ca-duree') * .4 - performance.now();
      if (reduit() || (reste <= 0 && !file.length)) { aller(dir); return; }
      if (file.length < 2) file.push(dir);
      if (!fileT) fileT = setTimeout(jouerFile, Math.max(0, reste));
    }

    ecoute($('[data-h="prec"]', hero), 'click', function () { geste(-1); });
    ecoute($('[data-h="suiv"]', hero), 'click', function () { geste(1); });
    $$('.fleche', hero).forEach(function (b) { appui(b, true, ecoute); });
    appui(btn, false, ecoute);
    // Voisines : un clic les fait glisser au centre ; l'œuvre centrale mène à sa fiche
    ecoute(ca, 'click', function (e) {
      var it = e.target.closest && e.target.closest('.ca-it');
      if (!it) return;
      var d = decal(PAR_N[it.dataset.n]);
      if (d === 0) return;
      e.preventDefault();
      if (Math.abs(d) === 1) geste(d);
    });
    // Voisines (cachées aux lecteurs d'écran) : pas de focus à la souris ; léger enfoncement à l'appui
    ecoute(ca, 'mousedown', function (e) { var it = e.target.closest('.ca-it'); if (it && !it.classList.contains('centre')) e.preventDefault(); });
    ecoute(ca, 'pointerdown', function (e) { var it = e.target.closest('.ca-it'); if (it && it.classList.contains('vois') && e.button === 0) it.classList.add('appuye'); });
    ['pointerup', 'pointercancel'].forEach(function (t) {
      ecoute(document, t, function () { $$('.ca-it.appuye', ca).forEach(function (el) { el.classList.remove('appuye'); }); });
    });
    ecoute(ca, 'dragstart', function (e) { e.preventDefault(); });
    ecoute(btn, 'click', function () {
      if (carArret) { carArret = false; st.manuel = pauseManuelle = false; st.pas = 0; st.focus = false; lancer(); return; }
      st.manuel = pauseManuelle = !st.manuel; st.focus = false; appliquer();
    });
    // Pause au survol des œuvres (souris), au focus clavier, onglet caché, héros hors de l'écran
    // (zone de survol : les œuvres seulement, pas le bouton Pause ni la barre)
    ecoute(zone, 'pointerenter', function (e) { if (e.pointerType === 'mouse') { st.survol = true; appliquer(); } });
    ecoute(zone, 'pointerleave', function () { if (st.survol) { st.survol = false; appliquer(); } });
    function dansZone(el) { return el && el !== btn && ((sc.contains(el) && !ctl.contains(el)) || cartel.contains(el)); }
    ecoute(hero, 'focusin', function (e) {
      var fv = false; try { fv = e.target.matches(':focus-visible'); } catch (x) { fv = true; }
      if (dansZone(e.target) && fv) { st.focus = true; appliquer(); }
    });
    ecoute(hero, 'focusout', function (e) { if (st.focus && !dansZone(e.relatedTarget)) { st.focus = false; appliquer(); } });
    ecoute(document, 'visibilitychange', appliquer);
    ecoute(mqOrdi, 'change', function () { construire(); appliquer(); });
    ecoute(mqReduit, 'change', function () { if (reduit()) arreter(); appliquer(); });
    if ('IntersectionObserver' in window) {
      var ioH = new IntersectionObserver(function (es) { st.horsVue = es[es.length - 1].intersectionRatio < 0.5; appliquer(); }, { threshold: [0, 0.5, 1] });
      ioH.observe(hero);
      nettoyage.push(function () { ioH.disconnect(); });
    }
    // Redimensionnement : les œuvres se replacent sans mouvement
    if ('ResizeObserver' in window) {
      var roS = new ResizeObserver(function () {
        if (!mqOrdi.matches) return;
        if (!ca.firstChild) { construire(); return; }
        fenetre(); // l'œuvre a pu changer entre-temps sur la rangée du téléphone
        $$('.ca-it', ca).forEach(function (el) { el.classList.add('neuf'); });
        placer();
        ecrireCartel();
      });
      roS.observe(zone);
      nettoyage.push(function () { roS.disconnect(); });
    }
    /* --- Téléphone et tablette (V6) : tapis roulant continu ---
       Une seule copie de la liste. « u » est une position sur la boucle (en px, chaque œuvre comptée à sa taille du
       milieu) qui avance d'un pas régulier à chaque image ; chaque œuvre est posée par translate3d + scale et opacity
       selon sa distance au milieu, modulo la longueur de la boucle : ni copie, ni saut, ni défilement natif.
       (scrollLeft et scroll-snap avancent par pixels entiers à petite vitesse sur iPhone et se battent avec le doigt ;
       translate3d glisse au sous-pixel, sur la carte graphique.) Les voisines rapetissent et pâlissent avec la
       distance (--ca-vois-*, comme l'ordinateur) ; à l'écran, l'écart entre deux œuvres reste --ca-ecart.
       Doigt : arrêt net, glissement libre avec élan, l'œuvre la plus proche se cale au milieu, reprise 5 s après.
       Aucune image calculée quand la rangée est hors de vue, l'onglet caché, un menu ou une fenêtre ouverts, le
       message d'accueil pas encore validé, ou le focus clavier dans la rangée ou sur « Voir l'œuvre ».
       Mouvement réduit : pas de défilement continu ; le doigt et le clavier marchent toujours. */
    var row = $('.rangee', hero), pos = $('.r-pos', hero), cm = $('.cartel-m', hero);
    var items = $$('.r-it', row), NB = items.length;
    var oeuvresT = items.map(function (it) { return PAR_N[it.dataset.n]; }), rangsT = oeuvresT.map(rang);
    var VOIS_H = reglageCss('--ca-vois-h'), VOIS_MAX = reglageCss('--ca-vois-max'), VOIS_OP = reglageCss('--ca-vois-op');
    // Mesures : largeur de chaque œuvre au milieu, son centre sur la boucle, son échelle de voisine
    var larg = [], centre = [], sVois = [], boucle = 0, ecartT = 20, demi = 0, hautT = 0, portee = 1;
    var pX = [], pS = [], pO = [], ecritT = [], ecritO = [], dedans = [], pretes = [], barre = '';
    var u = 0, vit = 0, uCible = 0, iCible = -1, cT = -1;
    var mode = reduit() ? 'arret' : 'auto'; // auto (défile), doigt, ressort (se cale au milieu), arret (attend)
    var pretT = false, focusK = false, horsVueT = false, attente = false;
    var rafT = 0, tPrec = 0, repT = 0, doigt = null;
    var bloque = 0, lance = false, tPointeur = -1e9; // clic bloqué jusqu'à ; élan lancé au doigt ; dernier appui
    function tel() { return !mqOrdi.matches; }
    function mod(a, b) { return ((a % b) + b) % b; }
    function lisse(x) { return x >= 1 ? 1 : x * x * (3 - 2 * x); }
    function omega() { return reduit() ? 20 : 8; } // raideur du ressort (mouvement réduit : il se cale vite)
    function vitesse() { return boucle / NB / DEFILE_TEL; } // px de boucle par seconde
    // Distance sur la boucle du centre de l'œuvre i à la position x (entre −boucle/2 et +boucle/2 ; > 0 : à droite)
    function ecartDe(i, x) { return mod(centre[i] - x + boucle / 2, boucle) - boucle / 2; }
    function procheDe(x) {
      var k = 0;
      for (var i = 1; i < NB; i++) if (Math.abs(ecartDe(i, x)) < Math.abs(ecartDe(k, x))) k = i;
      return k;
    }
    function mesurerT() {
      demi = row.clientWidth / 2; hautT = row.clientHeight;
      if (!demi || !NB) { boucle = 0; return false; }
      ecartT = reglageCss('--ca-ecart', row);
      var rh = parseFloat(getComputedStyle(items[0]).height), x = 0, lmax = 0;
      items.forEach(function (it, i) {
        var w = parseFloat(getComputedStyle(it).width);
        larg[i] = w; lmax = Math.max(lmax, w);
        centre[i] = x + w / 2; x += w + ecartT;
        // Voisine : au plus --ca-vois-h de la hauteur de la rangée et --ca-vois-max de sa propre taille
        sVois[i] = Math.min(VOIS_MAX, rh * VOIS_H / (w / ratio(oeuvresT[i])));
      });
      boucle = x; portee = lmax + ecartT;
      return true;
    }
    // Pose pour la position x : centre à l'écran (depuis le milieu de la rangée), échelle et opacité de chaque
    // œuvre. L'œuvre la plus proche du milieu d'abord, puis ses voisines de proche en proche : l'écart à l'écran
    // reste ecartT quelle que soit leur échelle. Rend l'œuvre la plus proche du milieu.
    function calculer(x) {
      var c = procheDe(x), vc = ecartDe(c, x), a = Math.abs(vc), h = larg[c] / 2;
      var tailleA = function (i, v) { var k = lisse(Math.abs(v) / portee); pS[i] = 1 - (1 - sVois[i]) * k; pO[i] = 1 - (1 - VOIS_OP) * k; };
      tailleA(c, vc);
      pX[c] = (vc < 0 ? -1 : 1) * (Math.max(0, a - h) + pS[c] * Math.min(a, h));
      [1, -1].forEach(function (sens) {
        var j = c, v = vc, n = sens > 0 ? (NB - 1) >> 1 : NB - 1 - ((NB - 1) >> 1);
        for (var m = 0; m < n; m++) {
          var j2 = (j + sens + NB) % NB;
          v += sens * (larg[j] / 2 + ecartT + larg[j2] / 2);
          tailleA(j2, v);
          pX[j2] = pX[j] + sens * (pS[j] * larg[j] / 2 + ecartT + pS[j2] * larg[j2] / 2);
          j = j2;
        }
      });
      return c;
    }
    function visibleT(i) { return Math.abs(pX[i]) - pS[i] * larg[i] / 2 < demi; }
    function poser(tout) {
      if (!boucle) return;
      var c = calculer(u);
      for (var i = 0; i < NB; i++) {
        // Seules les œuvres à l'écran (ou presque) sont réécrites ; une œuvre qui sort l'est une dernière fois,
        // hors de la vue, où elle reste (même après un saut de plusieurs œuvres d'une image à l'autre)
        var proche = Math.abs(pX[i]) - pS[i] * larg[i] / 2 <= demi + 40;
        if (!tout && !proche && !dedans[i]) continue;
        dedans[i] = proche;
        var t = 'translate3d(' + (pX[i] - larg[i] / 2).toFixed(2) + 'px,0,0) scale(' + pS[i].toFixed(4) + ')';
        if (t !== ecritT[i]) items[i].style.transform = ecritT[i] = t;
        var o = pO[i].toFixed(3);
        if (o !== ecritO[i]) items[i].style.opacity = ecritO[i] = o;
      }
      // Œuvre du milieu : la seule atteinte par Tab (← → passent aux autres), le cartel la suit
      if (c !== cT) { if (cT >= 0) items[cT].tabIndex = -1; items[c].tabIndex = 0; cT = c; afficherT(oeuvresT[c]); chargerAutour(c); }
      // Barre : rang de l'œuvre au milieu (ou juste passée), plus la part du chemin vers la suivante. De la dernière
      // à la première, le trait sort à droite pendant que sa copie (.r-pos::before) rentre à gauche : pas de saut.
      var a = ecartDe(c, u) > 0 ? (c - 1 + NB) % NB : c, b = (a + 1) % NB;
      var f = Math.max(0, Math.min(1, -ecartDe(a, u) / (larg[a] / 2 + ecartT + larg[b] / 2)));
      var tb = 'translateX(' + ((rangsT[a] + f) * 100).toFixed(1) + '%)';
      if (tb !== barre) pos.style.transform = barre = tb;
    }
    // Le cartel suit l'œuvre du milieu (réécrit seulement quand elle change)
    function afficherT(x) {
      heros = x; // au retour sur l'accueil, la rangée repart de cette œuvre
      if ($('[data-m="voir"]', cm).getAttribute('href') === lienOeuvre(x)) return;
      $('[data-m="type"]', cm).textContent = x.type;
      $('[data-m="statut"]', cm).innerHTML = statut(x);
      $('[data-m="voir"]', cm).href = lienOeuvre(x);
      majSv($('[data-m="titre"]', cm), simuO(x, 'titre'));
      majSv($('[data-m="annee"]', cm), simuO(x, 'annee'));
    }
    // Les voisines se chargent d'avance (2 avant, 3 après). Prête hors de l'écran : montrée d'un coup, sans fondu,
    // elle entre déjà dessinée. Le tapis attend une image pas encore prête (garde) : jamais de trou.
    function chargerAutour(c) {
      for (var k = -2; k <= 3; k++) (function (i) {
        var im = $('img', items[i]);
        if (!im || pretes[i] != null) return;
        pretes[i] = false;
        if (im.loading === 'lazy') im.loading = 'eager';
        imagePrete(im).then(function () {
          pretes[i] = true;
          if (quitte) return;
          if (!visibleT(i) && im.complete && im.naturalWidth) montrerTout(im);
          if (attente) demander();
        });
      })((c + k + NB) % NB);
    }
    // Distance à l'écran avant qu'une œuvre pas encore prête n'entre par la droite (négative : déjà visible)
    function garde() {
      var g = Infinity;
      for (var i = 0; i < NB; i++) {
        if (pretes[i] === true || pX[i] + pS[i] * larg[i] / 2 <= 0) continue;
        g = Math.min(g, pX[i] - pS[i] * larg[i] / 2 - demi);
      }
      return g;
    }
    // (Re)mesure : on garde l'œuvre du milieu et son décalage ; la première fois, l'œuvre du héros au milieu
    function replacer() {
      var c = boucle ? cT : oeuvresT.indexOf(heros), d = boucle && c >= 0 ? -ecartDe(c, u) : 0;
      if (!mesurerT()) return;
      u = centre[Math.max(0, c)] + d;
      if (mode === 'ressort') uCible = u + ecartDe(iCible, u);
      poser(true);
    }
    function pauseT() {
      return !pretT || reduit() || horsVueT || document.hidden || focusK || document.documentElement.classList.contains('bloque');
    }
    function demander() {
      attente = false;
      if (!rafT && !quitte) { tPrec = 0; rafT = requestAnimationFrame(image); }
    }
    // Une image : vitesse qui monte ou descend en douceur, ressort, pose
    function image(t) {
      rafT = 0;
      if (quitte || !tel()) return;
      if (!boucle) { replacer(); if (!boucle) return; }
      var dt = tPrec ? Math.min(0.05, Math.max(0, (t - tPrec) / 1000)) : 0;
      tPrec = t;
      if (mode === 'auto') {
        if (pauseT()) { vit = 0; return; }
        // Vitesse visée : pleine, ralentie puis nulle devant une image pas prête (2 s de marge, sans à-coup)
        var V = vitesse(), g = garde(), cible = V * Math.max(0, Math.min(1, g / (2 * V)));
        vit += (cible - vit) * (1 - Math.exp(-dt / 0.45));
        u += Math.min(vit * dt, Math.max(0, g) / 1.5);
        if (cible === 0 && vit < 1) { vit = 0; attente = true; } // on attend l'image sans calculer
      } else if (mode === 'ressort') {
        // Ressort amorti sans rebond, calculé exactement : stable même quand les images s'espacent (téléphone lent)
        var w = omega(), x = u - uCible, e = Math.exp(-w * dt), j = (vit + w * x) * dt;
        u = uCible + (x + j) * e; vit = (vit - w * j) * e;
        if (Math.abs(u - uCible) < 0.3 && Math.abs(vit) < 5) { u = uCible; vit = 0; mode = 'arret'; }
      }
      poser(false);
      if ((mode === 'auto' && !attente) || mode === 'ressort') rafT = requestAnimationFrame(image);
    }
    // Pause ou reprise (rangée hors de vue, onglet, menu, message, focus clavier) : rien ne tourne pendant la pause,
    // la reprise part de l'arrêt
    function majPause() {
      if (quitte || !tel() || mode !== 'auto') return;
      if (!pauseT()) { demander(); return; }
      vit = 0;
      if (rafT) { cancelAnimationFrame(rafT); rafT = 0; }
    }
    // L'œuvre i vient au milieu : ressort amorti sans rebond, qui part de la vitesse v (ou tout de suite)
    function caler(i, v, immediat) {
      iCible = i; uCible = u + ecartDe(i, u); lance = false;
      if (immediat) { u = uCible; vit = 0; mode = 'arret'; poser(true); return; }
      var w = omega() * Math.abs(u - uCible);
      vit = Math.max(-w, Math.min(w, v || 0)); // pas plus vite que le ressort : on ne dépasse pas l'œuvre
      mode = 'ressort'; demander();
    }
    // Un geste de la personne : le tapis s'arrête, le cartel reparle aux lecteurs d'écran
    function gesteTel() { clearTimeout(repT); repT = 0; cm.setAttribute('aria-live', 'polite'); }
    function auto(v) { mode = 'auto'; vit = v || 0; cm.setAttribute('aria-live', 'off'); majPause(); } // (pas d'annonce en défilant)
    function plusTard() {
      clearTimeout(repT);
      repT = setTimeout(function () { repT = 0; if (mode === 'arret' && !reduit()) auto(); }, REPRISE_TEL);
    }
    // Doigt (ou souris) : arrêt net ; au-delà de 8 px à l'horizontale, la rangée suit le doigt
    ecoute(row, 'pointerdown', function (e) {
      if (!tel() || !boucle || doigt || (e.pointerType === 'mouse' && e.button !== 0)) return;
      gesteTel(); bloque = 0;
      var t = performance.now(), xd = e.clientX - row.getBoundingClientRect().left - demi, k = 0;
      for (var i = 1; i < NB; i++) if (Math.abs(pX[i] - xd) < Math.abs(pX[k] - xd)) k = i;
      var it = e.target && e.target.closest ? e.target.closest('.r-it') : null;
      doigt = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, t0: t, glisse: false, pas: [[t, u]], it: k, avant: mode,
        vit: vit,                                          // vitesse du défilement continu, gardée pour la reprise
        vise: mode === 'ressort' ? iCible : cT,            // œuvre au milieu (ou qui y va)
        cible: it ? items.indexOf(it) : -1,                // œuvre touchée (−1 : à côté des œuvres)
        vite: mode === 'ressort' && lance && Math.abs(vit) > 120 }; // la rangée file encore après un élan
      mode = 'doigt'; vit = 0;
      if (rafT) { cancelAnimationFrame(rafT); rafT = 0; }
    });
    ecoute(row, 'pointermove', function (e) {
      if (!doigt || e.pointerId !== doigt.id) return;
      if (e.pointerType === 'mouse' && !e.buttons) { lacher(e); return; } // bouton relâché hors de la page
      if (!doigt.glisse) {
        var dx = e.clientX - doigt.x0, dy = e.clientY - doigt.y0;
        if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy)) return; // (à la verticale, la page défile)
        doigt.glisse = true; doigt.x = e.clientX;
        try { row.setPointerCapture(e.pointerId); } catch (er) { /* doigt déjà levé */ }
      }
      // L'œuvre tenue avance à l'écran autant que le doigt (les voisines, plus petites, vont moins vite)
      calculer(u); var x1 = pX[doigt.it]; calculer(u + 1);
      u -= (e.clientX - doigt.x) / Math.max(0.3, Math.min(1.5, x1 - pX[doigt.it]));
      doigt.x = e.clientX;
      var t = performance.now();
      doigt.pas.push([t, u]);
      while (doigt.pas.length > 2 && t - doigt.pas[0][0] > 100) doigt.pas.shift();
      demander();
    });
    function lacher(e) {
      if (!doigt || e.pointerId !== doigt.id) return;
      var d = doigt, t = performance.now(), long = t - d.t0 > 500;
      doigt = null;
      if (!d.glisse && !long) {
        // Geste vertical (la page défile) pendant le défilement continu : il repart tout de suite, à sa vitesse
        if (e.type === 'pointercancel' && d.avant === 'auto') { auto(d.vit); return; }
        // Toucher bref sur l'œuvre du milieu : sa fiche s'ouvre (et elle se cale, si aucun clic ne suit). Sur une
        // voisine : elle vient au milieu, comme sur l'ordinateur. À côté des œuvres, pendant un élan (on l'arrête)
        // ou geste annulé : la rangée se cale sur l'œuvre la plus proche, sans rien ouvrir.
        var tap = e.type === 'pointerup' && !d.vite && d.cible >= 0;
        if (!tap || d.cible !== d.vise) bloque = t + 500;
        caler(tap ? d.cible : procheDe(u), 0);
        plusTard(); return;
      }
      bloque = t + 500; // un glissement ou un appui long n'ouvre pas la fiche
      // Élan : vitesse des 100 dernières ms (nulle si le doigt s'est arrêté avant de se lever), au plus 4 œuvres
      var v = 0, a = d.pas[0], b = d.pas[d.pas.length - 1], m = 4 * boucle / NB;
      if (d.glisse && !reduit() && t - b[0] < 80 && b[0] - a[0] > 10) v = (b[1] - a[1]) / (b[0] - a[0]) * 1000;
      caler(procheDe(u + Math.max(-m, Math.min(m, v * 0.35))), v);
      lance = d.glisse;
      plusTard();
    }
    // Sur window : un bouton de souris relâché hors de la rangée la libère aussi
    ecoute(window, 'pointerup', lacher, true);
    ecoute(window, 'pointercancel', lacher, true);
    // iOS : une fois le glisser horizontal décidé, la page ne le reprend pas en cours de geste
    ecoute(row, 'touchmove', function (e) { if (doigt && doigt.glisse && e.cancelable) e.preventDefault(); }, { passive: false });
    // Le clic qui suit un glissement, un appui long, un arrêt ou un toucher sur une voisine n'ouvre pas la fiche
    // (seulement dans les 500 ms : une activation plus tard, au clavier ou par VoiceOver, passe)
    ecoute(row, 'click', function (e) { if (performance.now() < bloque) { bloque = 0; e.preventDefault(); e.stopPropagation(); } }, true);
    // Dernier doigt ou clic (le focus d'un toucher arrive au mousedown, après le lâcher), ou retour sur l'onglet
    // (le navigateur y rend le focus d'avant, juste après l'événement focus de la fenêtre)
    ['pointerdown', 'pointerup', 'mousedown'].forEach(function (ty) { ecoute(document, ty, function () { tPointeur = performance.now(); }, true); });
    ecoute(window, 'focus', function () { tPointeur = performance.now(); });
    ecoute(row, 'dragstart', function (e) { e.preventDefault(); }); // pas de glisser-déposer des liens et des images
    ecoute(row, 'scroll', function () { row.scrollLeft = 0; }, { passive: true }); // (sans overflow: clip, rien ne défile)
    // Clavier : Tab atteint l'œuvre du milieu et la cale ; ← → passent à la voisine (le focus suit) ; le tapis attend
    // tant que le focus clavier est dans la rangée ou sur « Voir l'œuvre » (l'œuvre ne change pas sous les yeux)
    [row, cm].forEach(function (z) {
      ecoute(z, 'focusin', function (e) {
        var fv = true; try { fv = e.target.matches(':focus-visible'); } catch (x) { /* ancien navigateur */ }
        // Focus du clavier ou d'un lecteur d'écran (VoiceOver ne passe pas par :focus-visible) : le tapis attend.
        // Pas celui que pose un doigt, une souris ou le retour d'une fiche.
        if (!fv && (focusScript || performance.now() - tPointeur < 600)) return;
        if (!tel() || !boucle) return;
        focusK = true; gesteTel();
        if (mode === 'auto') { mode = 'arret'; majPause(); }
        var i = items.indexOf(e.target);
        if (i < 0) i = cT; // « Voir l'œuvre » : son œuvre se cale au milieu
        if (i >= 0 && !(mode === 'ressort' && iCible === i)) caler(i, 0, reduit());
      });
      ecoute(z, 'focusout', function (e) {
        if (focusK && !row.contains(e.relatedTarget) && !cm.contains(e.relatedTarget)) { focusK = false; plusTard(); }
      });
    });
    function toucheTel(dir) {
      var a = document.activeElement;
      if (!boucle || !a || (!row.contains(a) && !cm.contains(a))) return false;
      focusK = true; gesteTel();
      var i = ((mode === 'ressort' ? iCible : cT) + dir + NB) % NB;
      caler(i, mode === 'ressort' ? vit : 0, reduit());
      if (row.contains(a)) items[i].focus({ preventScroll: true });
      return true;
    }
    ecoute(document, 'visibilitychange', majPause);
    ecoute(mqOrdi, 'change', majPause);
    ecoute(mqReduit, 'change', function () {
      if (reduit() && (mode === 'auto' || mode === 'ressort')) { clearTimeout(repT); if (boucle) caler(cT, 0, true); else mode = 'arret'; }
      else if (!reduit() && mode === 'arret' && !repT) auto();
    });
    if ('IntersectionObserver' in window) {
      var ioT = new IntersectionObserver(function (es) {
        horsVueT = es[es.length - 1].intersectionRatio < 0.5;
        majPause();
      }, { threshold: [0, 0.5] });
      ioT.observe(row);
      nettoyage.push(function () { ioT.disconnect(); });
    }
    // Taille qui change (rotation, passage à la tablette, retour du téléphone) : on remesure et on garde l'œuvre
    if ('ResizeObserver' in window) {
      var roT = new ResizeObserver(function () {
        if (!row.clientWidth) { boucle = 0; return; } // rangée cachée (ordinateur)
        if (boucle && row.clientWidth / 2 === demi && row.clientHeight === hautT) return;
        replacer();
      });
      roT.observe(row);
      nettoyage.push(function () { roT.disconnect(); });
    }
    // Pose de départ tout de suite (la transition de page la photographie) ; défilement après « OK » sur le message.
    // Retour d'une fiche : l'œuvre vue au milieu, le tapis repart 5 s après, comme après un geste.
    items.forEach(function (it) { it.tabIndex = -1; });
    if (tel()) replacer();
    if (retourTel && mode === 'auto') { mode = 'arret'; plusTard(); }
    retourTel = false;
    cm.setAttribute('aria-live', mode === 'auto' ? 'off' : 'polite');
    apresMessage(function () { if (quitte) return; pretT = true; majPause(); });

    construire();
    majBouton();
    // La première barre part quand l'œuvre du héros est affichée (connexion lente : on ne la saute pas)
    // et, à la première visite, seulement après « OK » sur le message d'accueil
    var imH = imgDe(heros);
    Promise.resolve(imH && imH.decode ? imH.decode().catch(noop) : null).then(function () {
      apresMessage(function () { if (!quitte) lancer(); });
    });
    return {
      quitter: function () {
        quitte = true;
        if (st.anim) st.anim.cancel();
        if (rafT) cancelAnimationFrame(rafT);
        clearTimeout(repT);
        cartJeton++;
        clearTimeout(fileT); clearTimeout(repriseT); file = [];
        Object.keys(departs).forEach(function (n) { clearTimeout(departs[n]); });
        nettoyage.forEach(function (f) { f(); });
      },
      // ← → quand le héros est visible (ordinateur) : premier geste, donc arrêt du défilement.
      // Téléphone : quand le focus est dans la rangée ou sur « Voir l'œuvre ».
      touche: function (dir) {
        if (!mqOrdi.matches) return toucheTel(dir);
        if (st.horsVue) return false;
        geste(dir);
        return true;
      },
      majPause: majPause // menu, visionneuse ou message ouverts ou fermés (bloquer)
    };
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
        c.label + ' <span class="mono">' + compte(c.id) + '</span></a>';
    }).join('');

    var ordre = e.vue === 'index' ? LISTE : ORDRE_GRILLE.map(function (n) { return PAR_N[n]; });
    var liste = ordre.filter(function (o) { return (e.cat === 'toutes' || o.cat === e.cat) && (!e.dispo || dispo(o)); });

    var intro = e.vue === 'index'
      ? '<b>24 œuvres</b> en liste, par numéro. Titre, année, dimensions ' + ph('[et prix, si à vendre]', simuT('indexEtPrix')) + ' d\'un coup d\'œil.'
      : '<b>24 œuvres</b>&#8239;: peintures, collages, sculptures et dessins. ' + ph('[Pièces uniques&#8239;? à confirmer]', simuT('galeriePiecesUniques'));

    var res;
    if (!liste.length) {
      res = '<p class="gal-vide">Aucune œuvre ne correspond à ces filtres. <a href="' + hashGalerie(avec(e, { cat: 'toutes', dispo: false })) + '">Voir toutes les œuvres</a></p>';
    } else if (e.vue === 'index') {
      var o0 = liste[0];
      // La vue Index est une liste de catalogue : elle garde une colonne N° discrète
      res = '<div class="idx"><div class="idx-liste">' +
        '<div class="ligne ligne-hd mono" aria-hidden="true"><span>N°</span><span></span><span>Titre</span><span>Année</span><span>Dimensions</span><span>Prix · statut</span></div>' +
        liste.map(function (o) {
          return '<a class="ligne" href="' + lienOeuvre(o) + '" data-n="' + o.n + '">' +
            '<span class="mono l-n">' + o.n + '</span>' +
            '<span class="vign"><img src="' + vignette(o) + '" alt="" width="' + o.w + '" height="' + o.h + '" loading="lazy" decoding="async"></span>' +
            '<span class="l-t">' + ph('[Titre à fournir]', simuO(o, 'titre')) + ' <span class="l-fl" aria-hidden="true">→</span><span class="mono l-type">' + esc(o.type) + '</span></span>' +
            ph('[—]', simuO(o, 'annee'), 'l-y', '', 'phl') + ph('[— × — cm]', simuO(o, 'dimensions'), 'l-d', '', 'phl') +
            '<span class="l-p">' + prixCourt(o) + '</span></a>';
        }).join('') +
        '</div>' +
        '<aside class="idx-ap" aria-label="Aperçu de l\'œuvre survolée">' +
          '<div class="ap-mur"><img data-ap="img" src="' + vignette(o0) + '" alt="' + esc(alt(o0)) + '" width="' + o0.w + '" height="' + o0.h + '" style="--r:' + ratio(o0).toFixed(4) + '"></div>' +
          '<div class="ap-cap"><b>' + ph('[Titre à fournir]', simuO(o0, 'titre'), '', ' data-ap="titre"') + '</b><span class="mono"><span data-ap="type">' + esc(o0.type) + '</span> · N° <span data-ap="n">' + o0.n + '</span></span></div>' +
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
          '<p class="gal-intro-m m-only">Peintures, collages, sculptures et dessins.</p>' +
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
      html: html, titre: (e.cat !== 'toutes' ? CAT[e.cat].label + ' · ' : '') + 'Galerie', nav: 'galerie', appel: {},
      annonce: n + (n > 1 ? ' œuvres' : ' œuvre') + ' sur ' + TOTAL,
      apres: function () {
        justifier($('#grille'), liste, nGalerie, { prix: true, replier: true, eager1: true });
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
            majSv($('[data-ap="titre"]', ap), simuO(o, 'titre'));
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

    // Les boutons mènent au bloc d'appel de la même page, formulaire prérempli
    var boutons = dispo(o)
      ? '<button type="button" class="btn btn-noir" data-demande="acheter">Acheter <span aria-hidden="true">→</span></button>' +
        '<button type="button" class="btn btn-ligne" data-demande="infos">Demander des infos <span aria-hidden="true">→</span></button>'
      : '<button type="button" class="btn btn-noir" data-demande="semblable">Demander une œuvre semblable <span aria-hidden="true">→</span></button>';
    var ref = '<span class="mono fi-ref">N° ' + o.n + '</span>'; // référence discrète
    var prix = dispo(o)
      ? '<div class="fi-prix"><span class="mono">Prix</span><span class="fi-prix-v">' + chf(o.prix) + '</span></div><p class="fi-note">' + ref + '<span class="ex">Prix d\'exemple</span></p>'
      : '<div class="fi-prix"><span class="mono">Prix</span><span class="fi-prix-v">' + PASTILLE + 'Vendue' + EX + '</span></div><p class="fi-note">' + ref + '</p>';

    var ligneTab = function (th, td) { return '<tr><th scope="row">' + th + '</th><td>' + td + '</td></tr>'; };
    var so = function (k) { return simuO(o, k); };

    var html =
      '<div class="wrap">' +
        '<div class="fi-barre">' +
          '<nav class="mono fil d-only" aria-label="Fil d\'Ariane"><a href="#/galerie">Galerie</a> <span aria-hidden="true">/</span> <a href="' + lienCat + '">' + c.label + '</a> <span aria-hidden="true">/</span> <span aria-current="page">' + esc(o.type) + '</span></nav>' +
          '<a class="fi-retour m-only" href="#/galerie">← Galerie</a>' +
        '</div>' +
        '<div class="fi">' +
          '<div class="fi-media">' +
            '<div class="fi-mur" data-vue="oeuvre" style="--r:' + ratio(o).toFixed(4) + '">' +
              '<button type="button" class="fi-zoom" data-zoom aria-label="Voir l\'œuvre en grand"><img src="' + grande(o) + '" srcset="' + srcset(o) + '" sizes="(min-width: 760px) 490px, 82vw" alt="' + esc(alt(o)) + ', vue entière" width="' + o.w + '" height="' + o.h + '" fetchpriority="high" data-vig="' + vignette(o) + '" style="--vig:url(' + vignette(o) + ')"></button>' +
              // Vue simulée en grand (détail, signature, échelle), posée au clic sur une vignette
              '<div class="fi-sim" aria-live="polite"></div>' +
              // Œuvres précédente et suivante : flèches rondes, même composant que l'accueil
              '<a class="fleche fleche-p" href="' + lienOeuvre(p) + '" data-sens="-1" aria-label="Œuvre précédente">' + flecheIc(-1) + '</a>' +
              '<a class="fleche fleche-s" href="' + lienOeuvre(s) + '" data-sens="1" aria-label="Œuvre suivante">' + flecheIc(1) + '</a>' +
            '</div>' +
            '<div class="fi-vues" role="group" aria-label="Vues de l\'œuvre">' +
              '<button type="button" class="vue-b vue1" data-vue="oeuvre" aria-pressed="true" aria-label="Vue entière de l\'œuvre"><img src="' + vignette(o) + '" alt="" width="' + o.w + '" height="' + o.h + '"></button>' +
              ['detail', 'signature', 'echelle'].map(function (t) {
                return '<button type="button" class="vue-b vue-sim' + (ctoHaut(o, t) ? ' cto-haut' : '') + (t === 'signature' && sigCachee(o) ? ' sig-cache' : '') + '" data-vue="' + t + '" aria-pressed="false">' + simHtml(o, t, false) + cartouche(o, t, false) + '</button>';
              }).join('') +
            '</div>' +
          '</div>' +
          '<div class="fi-info">' +
            '<p class="mono fi-k">' + esc(o.type) + '</p>' +
            '<h1 tabindex="-1">' + ph('[Titre à fournir]', so('titre')) + '</h1>' +
            '<p>Armel Promeneur, ' + ph('[année]', so('annee')) + '</p>' +
            '<table class="fi-tab"><tbody>' +
              ligneTab('Technique', ph('[à fournir]', so('technique'))) +
              ligneTab('Support', ph('[papier, toile, carton&#8239;?]', so('support'))) +
              ligneTab('Dimensions', ph('[H × L cm]', so('dimensions'))) +
              ligneTab('Édition', ph('[pièce unique, signée&#8239;?]', so('edition'))) +
              ligneTab('Encadrement', ph('[encadrée ou non]', so('encadrement'))) +
              ligneTab('Statut', statut(o)) +
            '</tbody></table>' +
            prix +
            '<div class="fi-btns">' + boutons + '</div>' +
            // Liste de confiance : rien n'est confirmé par Armel, tout reste provisoire
            '<ul class="fi-conf">' +
              '<li>' + ph('[Original signé&#8239;? à confirmer]', simuT('originalSigne')) + '</li>' +
              '<li>' + ph('[Certificat d\'authenticité&#8239;? à confirmer]', simuT('certificat')) + '</li>' +
              '<li>' + ph('[Retrait ou envoi&#8239;: à définir]', simuT('retraitEnvoi')) + '</li>' +
            '</ul>' +
            '<div class="fi-det">' +
              '<details><summary><span>À propos de l\'œuvre</span><span class="plus" aria-hidden="true"></span></summary><p>' + ph('[Quelques lignes d\'Armel sur cette œuvre&#8239;: ce qu\'elle montre, comment elle est faite.]', so('texte'), 'd-only') + ph('[Quelques lignes d\'Armel sur cette œuvre.]', so('texte'), 'm-only') + '</p></details>' +
              '<details><summary><span>Livraison et retrait</span><span class="plus" aria-hidden="true"></span></summary><p>' + ph('[À définir avec Armel&#8239;: envoi en Suisse et à l\'étranger, emballage, retrait sur place.]', simuT('livraison'), 'd-only') + ph('[À définir avec Armel.]', simuT('livraison'), 'm-only') + '</p></details>' +
              '<details><summary><span>Paiement, certificat et retours</span><span class="plus" aria-hidden="true"></span></summary><p>' + ph('[À définir&#8239;: moyens de paiement, certificat d\'authenticité, conditions de retour.]', simuT('paiement'), 'd-only') + ph('[À définir avec Armel.]', simuT('paiement'), 'm-only') + '</p></details>' +
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
      html: html, titre: o.type + ' · réf. ' + o.n, nav: 'galerie', appel: { oeuvre: o.n },
      apres: function () {
        justifier($('#autres-liste'), autres, nAutres);
        var mur = $('.fi-mur', main), sim = $('.fi-sim', main);
        // Flèches : enfoncement, rebond et onde ; on retient le sens pour le glissement et le rebond sur la fiche suivante
        $$('.fleche', mur).forEach(function (b) {
          appui(b, false);
          b.addEventListener('click', function () { sensFiche = { d: +b.dataset.sens, fl: true, t: Date.now() }; });
        });
        // Arrivée par une flèche : la flèche de la nouvelle fiche garde le focus et finit le geste (rebond et onde)
        var fl = sensFiche && sensFiche.fl && Date.now() - sensFiche.t < 1500 ? $('.fleche' + (sensFiche.d < 0 ? '-p' : '-s'), mur) : null;
        focusApres = fl;
        if (fl && !reduit()) {
          if (fl.animate) {
            fl.animate([{ transform: 'scale(' + reglageCss('--fl-appui') + ')' }, { transform: 'scale(1)' }],
              { duration: reglageCss('--fl-retour-duree'), easing: getComputedStyle(document.documentElement).getPropertyValue('--e-ressort').trim() || E_ENTREE });
            onde(fl);
          }
        }
        sensFiche = null;
        // Téléphone : glisser à gauche ou à droite sur l'image change d'œuvre (geste net et surtout horizontal)
        var g = null, glisse = 0;
        mur.addEventListener('pointerdown', function (e) {
          g = e.pointerType === 'mouse' || e.target.closest('.fleche') ? null : { x: e.clientX, y: e.clientY, t: Date.now() };
        });
        mur.addEventListener('pointercancel', function () { g = null; });
        mur.addEventListener('pointerup', function (e) {
          if (!g) return;
          var dx = e.clientX - g.x, dy = e.clientY - g.y, dt = Date.now() - g.t;
          g = null;
          if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5 || dt > 700) return;
          glisse = Date.now();
          var dir = dx < 0 ? 1 : -1; // vers la gauche : œuvre suivante
          sensFiche = { d: dir, t: Date.now() };
          location.hash = lienOeuvre(voisin(o, dir));
        });
        $$('[data-zoom]', main).forEach(function (b) {
          b.addEventListener('click', function () { if (Date.now() - glisse > 400) ouvrirVisio(o, b); });
        });
        // Vignettes : la vue choisie s'affiche en grand dans le cadre (la première ramène l'œuvre entière)
        $$('[data-vue]', $('.fi-vues', main)).forEach(function (b) {
          b.addEventListener('click', function () {
            var t = b.dataset.vue;
            if (mur.dataset.vue === t) return;
            $$('[data-vue]', $('.fi-vues', main)).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
            if (t !== 'oeuvre') {
              sim.innerHTML = simHtml(o, t, true) + cartouche(o, t, true);
              // D'une vue simulée à l'autre : la nouvelle apparaît en fondu
              if (mur.dataset.vue !== 'oeuvre' && !reduit() && sim.animate) sim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: E_UI });
            }
            mur.dataset.vue = t;
          });
        });
        $$('[data-demande]', main).forEach(function (b) {
          b.addEventListener('click', function () { if (form$) form$.ouvrir(o.n, b.dataset.demande); });
        });
        // Œuvres précédente et suivante préchargées une fois l'image de la fiche chargée
        var im = $('.fi-zoom img', main);
        quandCharge(im, function () {
          if (actuel && actuel.page === 'oeuvre' && actuel.oeuvre === o) [p, s].forEach(function (x) { decoder(variante(x, im)); });
        });
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
    visio.setAttribute('aria-label', 'Œuvre en grand');
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
    var oc = PAR_N[OEUVRE_APROPOS] || LISTE[0];
    var photo = function (src, w, h, a, legende) {
      return '<figure class="ap-r-f"><img src="img/' + src + '" alt="' + a + '" width="' + w + '" height="' + h + '" loading="lazy" decoding="async" data-rv="clip">' + (legende ? '<figcaption>' + legende + '</figcaption>' : '') + '</figure>';
    };
    var html =
      '<div class="wrap">' +
        '<section class="ap">' +
          '<figure class="ap-fig"><img src="img/portrait-armel.jpg" alt="Portrait d\'Armel Promeneur, chapeau et lunettes rondes" width="1110" height="1110" fetchpriority="high"></figure>' +
          '<div class="ap-c">' +
            '<p class="mono">À propos</p>' +
            '<h1 tabindex="-1" data-rv="lignes">' + lignes(['Peintre et sculpteur,', 'de la Guadeloupe', 'à la Suisse.']) + '</h1>' +
            '<table class="tab"><tbody>' +
              '<tr><th scope="row">Origine</th><td>Guadeloupe</td></tr>' +
              '<tr><th scope="row">Vit et travaille</th><td>En Suisse, ' + ph('[ville à fournir]', simuT('ville')) + '</td></tr>' +
              '<tr><th scope="row">Pratique</th><td>Peinture, collage, sculpture sur bois, dessin</td></tr>' +
              '<tr><th scope="row">Expositions</th><td>Pop-up Pepeuf, Markthalle Basel, 22–28 juin 2026<br>' + ph('[autres expositions à fournir]', simuT('expositions')) + '</td></tr>' +
              '<tr><th scope="row">Instagram</th><td>' + lienInsta() + '</td></tr>' +
            '</tbody></table>' +
            '<p class="ap-bio">' + ph('[Biographie à écrire avec Armel, cinq à huit lignes&#8239;: son parcours, ses techniques, les artistes qui l\'inspirent (il a signé des hommages à Wifredo Lam et à Picasso).]', simuT('bio')) + '</p>' +
          '</div>' +
        '</section>' +
        // Citation d'Armel en grand
        '<figure class="ap-cit">' +
          '<blockquote><p data-rv>«&#8239;' + ph('[Une phrase d\'Armel sur son travail, à fournir]', simuT('citation')) + '&#8239;»</p></blockquote>' +
          '<figcaption class="mono">Armel Promeneur</figcaption>' +
        '</figure>' +
        // Intertitres courts, une œuvre en grand entre deux paragraphes ; les photos d'atelier ne mènent à aucune fiche
        '<section class="ap-recit" aria-label="Son travail">' +
          '<div class="ap-r">' +
            '<div class="ap-r-t"><h2 data-rv>Le trait</h2><p>' + ph('[Quelques lignes d\'Armel sur le dessin et la peinture, à écrire avec lui.]', simuT('trait')) + '</p></div>' +
            photo('atelier-peinture.jpg', 1440, 1440, 'Armel Promeneur peignant un grand portrait', 'La peinture, en grand format') +
          '</div>' +
          '<div class="ap-r ap-r-inv">' +
            '<a class="ap-r-o" href="' + lienOeuvre(oc) + '"><img src="' + grande(oc) + '" alt="' + esc(alt(oc)) + '" width="' + oc.w + '" height="' + oc.h + '" loading="lazy" decoding="async" data-rv></a>' +
            '<div class="ap-r-t"><h2 data-rv>Le collage</h2><p>' + ph('[Quelques lignes d\'Armel sur le collage, à écrire avec lui.]', simuT('collage')) + '</p>' +
              '<p class="ap-r-leg mono">' + esc(oc.type) + ' · ' + ph('[Titre à fournir]', simuO(oc, 'titre')) + '</p>' +
              '<a class="lien-s" href="' + lienOeuvre(oc) + '">Voir cette œuvre <span aria-hidden="true">→</span></a></div>' +
          '</div>' +
          '<div class="ap-r">' +
            '<div class="ap-r-t"><h2 data-rv>Le bois</h2><p>' + ph('[Quelques lignes d\'Armel sur la sculpture sur bois, à écrire avec lui.]', simuT('bois')) + '</p></div>' +
            photo('atelier-bois.jpg', 1080, 1080, 'Armel Promeneur travaillant le bois dehors, dans un jardin', '') +
          '</div>' +
          '<div class="ap-r ap-r-expo">' +
            photo('exposition-minoterie.jpg', 1080, 1294, 'Une œuvre d\'Armel Promeneur accrochée au mur d\'une salle', 'Accrochage ' + ph('[lieu et date à fournir]', simuT('accrochage'))) +
          '</div>' +
        '</section>' +
      '</div>';
    return { html: html, titre: 'À propos', nav: 'a-propos', appel: {} };
  }

  /* ---------- Page : contact (le bloc d'appel en grand) ---------- */
  function pageContact(r) {
    var n = PAR_N[r.q.get('oeuvre')] ? r.q.get('oeuvre') : '';
    var d = r.q.get('demande');
    return { html: '', titre: 'Contact', nav: 'contact', appel: { page: true, oeuvre: n, demande: DEMANDES[d] ? d : '' } };
  }

  /* ---------- Page : impressum et protection des données (inchangée) ---------- */
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
                '<div><p class="mono">Responsable du site</p><p><strong>Armel Promeneur</strong> ' + ph('[nom civil, si différent du nom d\'artiste]', simuT('nomCivil')) + '<br>Peintre et sculpteur<br>' + ph('[adresse postale à fournir]', simuT('adresse')) + '<br>' + ph('[NPA, localité]', simuT('npaLocalite')) + '</p></div>' +
                '<div><p class="mono">Contact</p><p>' + ph('[e-mail à fournir]', simuT('email')) + '<br>Instagram ' + lienInsta() + '</p></div>' +
              '</div>' +
              '<h3>Registre du commerce</h3>' +
              '<p>' + ph('[Aucune inscription trouvée sur Zefix&#8239;: indiquer le numéro IDE s\'il existe, sinon retirer ce paragraphe.]', simuT('ide')) + '</p>' +
              '<h3>Conception du site</h3>' +
              '<p>CyberActivities, Dylan Borcard, Fribourg.</p>' +
              '<h3>Droits d\'auteur</h3>' +
              '<p>Les œuvres, les photos et les textes de ce site appartiennent à Armel Promeneur, sauf mention contraire ' + ph('[auteur des photos à confirmer]', simuT('auteurPhotos')) + '. Leur reproduction demande son accord écrit.</p>' +
              '<h3>Prix et vente</h3>' +
              '<p>' + ph('[Si les œuvres se vendent par le site&#8239;:]', simuT('siVente')) + deux(' les' + PRIX_TXT, 'Les' + PRIX_TXT) + ph('[sont indiqués avant la commande]', simuT('fraisLivraison')) + '. La disponibilité d\'une œuvre unique vous est confirmée à la commande.</p>' +
              '<p>' + ph('[Conditions de vente&#8239;: lien vers la page CGV, à rédiger.]', simuT('cgv')) + '</p>' +
              '<h3>Responsabilité</h3>' +
              '<p>Les informations de ce site sont soignées et tenues à jour, mais des erreurs restent possibles. Le lien vers Instagram mène à un autre site, dont le contenu ne dépend pas d\'Armel Promeneur.</p>' +
            '</section>' +
            '<section id="protection-donnees" class="lg-pd" aria-labelledby="pd-titre">' +
              '<h2 id="pd-titre" tabindex="-1">Protection des données</h2>' +
              '<p style="margin-top:16px">Cette déclaration explique comment Armel Promeneur traite vos données personnelles, selon la loi fédérale sur la protection des données (LPD).</p>' +
              '<h3>Qui est responsable&#8239;?</h3>' +
              '<p>Armel Promeneur, ' + ph('[adresse postale à fournir]', adressePd()) + ', ' + ph('[e-mail à fournir]', simuT('email')) + '.</p>' +
              '<h3>Quelles données, et pourquoi&#8239;?</h3>' +
              '<ul>' +
                '<li><strong>Formulaire de contact&#8239;:</strong> votre nom, votre e-mail, votre téléphone si vous le donnez, l\'œuvre qui vous intéresse et votre message. Ils servent à vous répondre.</li>' +
                '<li><strong>Achat d\'une œuvre</strong> ' + ph('[si la vente passe par le site]', simuT('siVenteAchat')) + '&#8239;: en plus, votre adresse de livraison et les données de la commande, pour vous livrer et établir la facture. ' + ph('[Moyen de paiement à définir&#8239;: s\'il passe par un prestataire, le nommer ici.]', simuT('moyenPaiement')) + '</li>' +
                '<li><strong>Visite du site&#8239;:</strong> comme tout site, le serveur enregistre des données techniques (adresse IP, date et heure, page consultée, type de navigateur). Elles servent seulement à faire fonctionner le site et à le protéger contre les abus.</li>' +
              '</ul>' +
              '<p>Vos données ne servent pas à de la publicité et ne sont pas vendues.</p>' +
              '<h3>Cookies et outils de suivi</h3>' +
              '<p>Ce site n\'utilise ni cookie publicitaire, ni outil de mesure d\'audience, ni bouton de réseau social. ' + ph('[Si la vente passe par le site&#8239;: seuls des cookies techniques, nécessaires au panier et au paiement.]', simuT('cookiesVente')) + ' ' + ph('[Les polices d\'écriture sont hébergées sur le serveur du site.]', simuT('polices')) + ' Le lien Instagram n\'ouvre Instagram que si vous cliquez&#8239;: Meta traite alors vos données selon ses propres règles.</p>' +
              '<h3>Qui reçoit vos données&#8239;?</h3>' +
              '<ul>' +
                '<li><strong>Armel Promeneur,</strong> qui lit vos messages et y répond.</li>' +
                '<li><strong>L\'hébergeur du site</strong> ' + ph('[en Suisse, à confirmer]', simuT('hebergeur')) + ', qui garde le site et les messages pour lui, sans les utiliser à ses propres fins.</li>' +
                '<li><strong>L\'outil d\'envoi du formulaire</strong> ' + ph('[à confirmer]', simuT('outilForm')) + ' et <strong>le fournisseur de messagerie</strong> ' + ph('[à confirmer]', simuT('messagerie')) + '.</li>' +
                '<li><strong>Pour un achat,</strong> ' + ph('[le prestataire de paiement et le transporteur, à définir]', simuT('achatPrestataires')) + '.</li>' +
                '<li><strong>Les autorités,</strong> seulement lorsque la loi l\'exige.</li>' +
              '</ul>' +
              '<h3>Données envoyées à l\'étranger</h3>' +
              '<p>' + ph('[À compléter quand les prestataires seront choisis&#8239;: si l\'un d\'eux traite des données hors de Suisse, le nommer avec le pays et la garantie prévue (par exemple Stripe&#8239;: Irlande et États-Unis, Swiss-U.S. Data Privacy Framework, à vérifier avant la mise en ligne). Pour une livraison hors de Suisse, l\'adresse est transmise au transporteur et aux douanes du pays de destination.]', simuT('prestataires')) + '</p>' +
              '<h3>Combien de temps&#8239;?</h3>' +
              '<ul>' +
                '<li>Les messages sont effacés quand ils ne servent plus à vous répondre ni à suivre une vente.</li>' +
                '<li>' + ph('[Si Armel établit des factures&#8239;:]', simuT('siFactures')) + deux(' les' + FACT_TXT, 'Les' + FACT_TXT) + '</li>' +
                '<li>Les données techniques des visites sont effacées après ' + ph('[durée fixée par l\'hébergeur, par exemple 30 jours]', simuT('dureeLogs')) + '.</li>' +
              '</ul>' +
              '<h3>Sécurité</h3>' +
              '<p>Le site est servi en connexion chiffrée (HTTPS). Seules les personnes qui en ont besoin pour vous répondre ont accès à vos messages.</p>' +
              '<h3 id="vos-droits" tabindex="-1">Vos droits</h3>' +
              '<p>Vous pouvez demander à tout moment quelles données sont conservées sur vous, les faire corriger ou effacer (sauf celles que la loi oblige à garder), et vous opposer à leur traitement. Écrivez à ' + ph('[e-mail à fournir]', simuT('email')) + '. Si la réponse ne vous satisfait pas, vous pouvez le signaler au Préposé fédéral à la protection des données et à la transparence (PFPDT, <a href="https://www.edoeb.admin.ch" target="_blank" rel="noopener">edoeb.admin.ch</a>) ou faire valoir vos droits devant les tribunaux.</p>' +
              '<h3>Changements</h3>' +
              '<p>Cette déclaration est adaptée si la façon de faire change. Version du ' + ph('[date de mise en ligne]', simuT('dateVersion')) + '.</p>' +
            '</section>' +
          '</div>' +
        '</div>' +
      '</div>';
    return { html: html, titre: 'Impressum et protection des données', nav: '', appel: null };
  }

  /* ---------- Page introuvable ---------- */
  function pageIntrouvable() {
    var html = '<div class="wrap"><section class="introuv">' +
      '<h1 tabindex="-1">Page introuvable</h1>' +
      '<a class="lien-s" href="#/galerie">Voir la galerie →</a>' +
      '</section></div>';
    return { html: html, titre: 'Page introuvable', nav: '', appel: null };
  }

  /* ---------- Téléphone et tablette (V5) : chaque photo apparaît en fondu, une fois chargée ET décodée ----------
     Jamais de photo à moitié dessinée : elle reste transparente jusqu'à ce qu'elle soit prête, puis fondu de 280 ms.
     Une photo déjà en mémoire (retour sur une page) s'affiche telle quelle. L'ordinateur garde ses apparitions. */
  var ioIm = null;
  // Élément qui porte le fondu : le cadre de la rangée de l'accueil (qui porte l'ombre), sinon l'image
  function cadreDe(im) { return (im.closest && im.closest('.r-cad')) || im; }
  // Promesse tenue quand l'image est chargée et décodée (ou en erreur ; au plus « max » ms si donné).
  // Le décodage seul est plafonné à 1,5 s (decode() bloqué sur certains WebKit) ; le chargement, lui, est attendu
  function imagePrete(im, max) {
    var p = new Promise(function (r) {
      if (!im) { r(); return; }
      var dec = function () { Promise.race([im.decode ? im.decode() : Promise.resolve(), attendre(1500)]).then(r, r); };
      if (im.complete) { if (im.naturalWidth) dec(); else r(); return; }
      im.addEventListener('load', dec, { once: true });
      im.addEventListener('error', function () { r(); }, { once: true });
    });
    return max ? Promise.race([p, attendre(max)]) : p;
  }
  // Affichée d'un coup, sans fondu
  function montrerTout(im) {
    var c = cadreDe(im);
    if (ioIm) ioIm.unobserve(c);
    c.classList.remove('att');
  }
  function preparerImages(ctx) {
    if (!ioIm) return;
    $$('img', ctx).forEach(function (im) {
      var c = cadreDe(im);
      if (c.classList.contains('att') || (im.complete && im.naturalWidth)) return;
      // Grande image de la fiche : si sa vignette est déjà en mémoire (venue de la rangée, de la galerie), elle est
      // montrée tout de suite par-dessous (styles.css) ; la grande la remplace en arrivant, sans trou ni pâleur
      if (im.dataset.vig) { var v = new Image(); v.src = im.dataset.vig; if (v.complete && v.naturalWidth) return; }
      c.classList.add('att');
      ioIm.observe(c);
    });
  }

  /* ---------- Apparitions au défilement (titres et images, une seule fois) ---------- */
  var ioRv = null;
  function preparerApparitions() {
    if (ioRv) { ioRv.disconnect(); ioRv = null; }
    if (ioIm) { ioIm.disconnect(); ioIm = null; }
    var els = $$('[data-rv]', main);
    if (reduit() || !('IntersectionObserver' in window)) return;
    // Téléphone et tablette : les photos ont leur fondu (ci-dessus) ; titres en simple fondu, sans cascade
    var tel = !mqOrdi.matches;
    if (tel) {
      ioIm = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          var c = e.target, im = c.tagName === 'IMG' ? c : $('img', c);
          ioIm.unobserve(c);
          if (im.loading === 'lazy') im.loading = 'eager';
          // Déjà reçue en entrant à l'écran : montrée d'un coup ; sinon fondu, seulement une fois reçue en entier
          var deja = im.complete && im.naturalWidth;
          imagePrete(im).then(function () { if (deja) montrerTout(im); else c.classList.add('vu'); });
        });
      }, { rootMargin: '0px 0px 120px 0px' });
      preparerImages(main);
      els = els.filter(function (el) { return el.tagName !== 'IMG' && !el.querySelector('img'); });
    }
    // Une image masquée par clip-path n'est vue ni par l'observateur ni par le chargement différé :
    // on observe donc son parent, et on la dévoile une fois chargée
    var cibles = new Map();
    els.forEach(function (el) {
      el.classList.add('rv');
      cibles.set(el.getAttribute('data-rv') === 'clip' ? el.parentElement : el, el);
    });
    ioRv = new IntersectionObserver(function (es) {
      var i = 0;
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = cibles.get(e.target);
        ioRv.unobserve(e.target);
        if (!el) return;
        // 70 ms de décalage, au plus 6 éléments en cascade
        el.style.setProperty('--d', tel ? '0ms' : Math.min(i++, 5) * 70 + 'ms');
        if (el.tagName === 'IMG' && !el.complete) {
          el.loading = 'eager';
          var montrer = function () { el.classList.add('vu'); };
          el.addEventListener('load', montrer, { once: true });
          el.addEventListener('error', montrer, { once: true });
        } else {
          el.classList.add('vu');
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    cibles.forEach(function (el, obs) { ioRv.observe(obs); });
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
    if (h === '' || h === '#' || h === '#/') return { page: 'accueil', q: vide, h: '#/' };
    if (h.slice(0, 2) !== '#/') return null; // simple ancre : on ne change pas de page
    var reste = h.slice(2);
    var qi = reste.indexOf('?');
    var chemin = qi < 0 ? reste : reste.slice(0, qi);
    var q = new URLSearchParams(qi < 0 ? '' : reste.slice(qi + 1));
    var seg = chemin.split('/').filter(Boolean).map(function (s) { try { return decodeURIComponent(s); } catch (e) { return s; } });
    var r = { page: 'introuvable', q: q, h: h };
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
  var focusApres = null; // élément à reprendre le focus après le changement de page (sinon le titre)
  var quitterPage = null;
  var defilements = {}; // position de défilement de chaque page quittée (retour depuis une fiche)

  function router(r) {
    r = r || analyser();
    if (!r) return;
    fermerMenu(false);
    fermerVisio(false);

    // Sous-ancre de l'impressum sur la même page : on défile seulement
    if (actuel && actuel.page === 'impressum' && r.page === 'impressum') {
      actuel = r;
      allerA(r.sous || 'impressum', true);
      return;
    }
    if (actuel) defilements[actuel.h] = window.scrollY;

    // Galerie → galerie (filtres) : on garde le défilement, le focus et ce qui est tapé dans le formulaire
    var meme = actuel && actuel.page === 'galerie' && r.page === 'galerie';
    var cle = meme && document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.k : null;
    var filtres = meme ? $('.filtres', main) : null;
    var scrollFiltres = filtres ? filtres.scrollLeft : 0;
    var saisie = meme && form$ ? form$.valeurs() : null;
    var retour = actuel && actuel.page === 'oeuvre' && r.page !== 'oeuvre' && defilements[r.h] != null;
    var nQuitte = retour ? actuel.oeuvre.n : null;

    if (quitterPage) { quitterPage(); quitterPage = null; }
    // Téléphone : retour d'une fiche sur l'accueil, la rangée repart de l'œuvre vue
    if (nQuitte && r.page === 'accueil' && !mqOrdi.matches) { heros = PAR_N[nQuitte]; retourTel = true; }
    var p = PAGES[r.page](r);
    blocs = [];
    document.body.setAttribute('data-page', r.page);
    document.body.setAttribute('data-appel', p.appel ? '1' : '0');
    main.innerHTML = p.html + (p.appel ? appelHtml(p.appel) : '');
    pied.innerHTML = piedHtml();
    document.title = r.page === 'accueil' ? p.titre : p.titre + ' — ' + NOM;
    majNav(p.nav);
    focusApres = null;
    if (p.apres) p.apres();
    quitterPage = p.quitter || null;
    brancherFormulaire(p.appel);
    if (saisie && form$) form$.remettre(saisie);

    // Zone d'annonce fixe (hors de <main>) : le nouveau nombre d'œuvres est lu après un changement de filtre
    var statutEl = document.getElementById('annonce');
    // (fiche → fiche par une flèche : le focus reste sur la flèche, on annonce la nouvelle œuvre)
    if (statutEl) statutEl.textContent = meme && p.annonce ? p.annonce : focusApres ? p.titre : '';

    if (meme) {
      var f2 = $('.filtres', main);
      if (f2) f2.scrollLeft = scrollFiltres;
      if (cle) { var el = $('[data-k="' + cle + '"]', main); if (el) el.focus({ preventScroll: true }); }
    } else {
      if (r.sous) allerA(r.sous, false);
      else window.scrollTo(0, retour ? defilements[r.h] : 0);
      if (!premiere) {
        var h1 = $('h1', main), carteQ = null;
        if (nQuitte) {
          var cs = $$('a[href="#/oeuvre/' + nQuitte + '"]', main).filter(function (a) { return a.getBoundingClientRect().width > 0; });
          carteQ = cs.filter(dansFenetre)[0] || cs[0] || null;
        }
        var cibleF = focusApres || carteQ || h1;
        if (cibleF) { focusScript = true; cibleF.focus({ preventScroll: true }); focusScript = false; }
      }
    }
    preparerApparitions();
    premiere = false;
    actuel = r;
  }

  /* ---------- Transitions de page (View Transitions, sinon rien) ---------- */
  var dernierClic = null; // lien d'œuvre cliqué : sa vignette grandit jusqu'à l'image de la fiche
  var sensFiche = null;   // fiche → fiche : { d: −1 ou 1, fl: venu d'une flèche, t: moment }
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href^="#/oeuvre/"]');
    if (!a) { dernierClic = null; return; }
    var img = a.querySelector('img');
    if (!img && a.closest('.hero-d')) img = $('.ca-it.centre img', main);
    if (!img && a.closest('.cartel-m')) img = $$('.r-it[href="' + a.getAttribute('href') + '"] img', main).filter(dansFenetre)[0] || null; // (si elle est à l'écran)
    dernierClic = { href: a.getAttribute('href'), img: img, t: Date.now() };
  }, true);

  // Image de l'œuvre n dans la page affichée (carte, ligne d'index, héros), rendue visible si besoin
  function trouverImage(n) {
    var c = $$('a[href="#/oeuvre/' + n + '"] img', main).filter(function (i) { return i.getBoundingClientRect().width > 0; });
    var vu = c.filter(dansFenetre)[0];
    if (vu) return vu;
    // Rangée du téléphone : on ne la fait pas sauter vers une œuvre hors de l'écran (pas de cible, simple fondu)
    c = c.filter(function (i) { return !i.closest('.rangee'); });
    if (c[0]) { c[0].scrollIntoView({ block: 'center', inline: 'nearest' }); return c[0]; }
    return null;
  }
  // Cartes de la grille : un nom par carte, seulement pendant un changement de filtre
  function nommerCartes(oui) {
    $$('#grille a.carte', main).forEach(function (a) {
      a.style.viewTransitionName = oui ? 'c-' + a.getAttribute('href').split('/').pop() : '';
    });
  }

  // Fiche : l'œuvre et ses infos glissent ; le cadre et les flèches gardent leur place
  function nommerFiche(oui) {
    var im = $('.fi-zoom', main), inf = $('.fi-info', main);
    if (im) im.style.viewTransitionName = oui ? 'fi-img' : '';
    if (inf) inf.style.viewTransitionName = oui ? 'fi-info' : '';
    $$('.fi-mur .fleche', main).forEach(function (b) {
      b.style.viewTransitionName = oui ? (b.classList.contains('fleche-p') ? 'fi-fl-p' : 'fi-fl-s') : '';
    });
  }

  var vtN = 0; // numéro de la dernière transition lancée
  function naviguer() {
    var r = analyser();
    if (!r) return;
    var sousAncre = actuel && actuel.page === 'impressum' && r.page === 'impressum';
    if (!document.startViewTransition || reduit() || !actuel || sousAncre) { router(r); return; }

    var type = 'page', sens = 1;
    var clicCarte = dernierClic && dernierClic.img && r.page === 'oeuvre' && dernierClic.href === '#/oeuvre/' + r.oeuvre.n && Date.now() - dernierClic.t < 2000;
    if (actuel.page === 'galerie' && r.page === 'galerie' && etatGalerie(actuel.q).vue === 'grille' && etatGalerie(r.q).vue === 'grille') type = 'filtre';
    else if (actuel.page === 'oeuvre' && r.page === 'oeuvre' && actuel.oeuvre !== r.oeuvre && !clicCarte) {
      // Fiche → fiche : glissement dans le sens du geste (sinon le plus court chemin dans la liste)
      type = 'fiche';
      var dd = (rang(r.oeuvre) - rang(actuel.oeuvre) + TOTAL) % TOTAL;
      sens = sensFiche && Date.now() - sensFiche.t < 1500 ? sensFiche.d : (dd > TOTAL / 2 ? -1 : 1);
    }
    var source = null, retourN = null;
    if (type === 'filtre') nommerCartes(true);
    else if (type === 'fiche') nommerFiche(true);
    else if (r.page === 'oeuvre' && dernierClic && dernierClic.href === '#/oeuvre/' + r.oeuvre.n && Date.now() - dernierClic.t < 2000) source = dernierClic.img;
    else if (actuel.page === 'oeuvre' && r.page !== 'oeuvre') { source = $('.fi-mur[data-vue="oeuvre"] .fi-zoom img', main); retourN = actuel.oeuvre.n; }
    dernierClic = null;
    if (source && !dansFenetre(source)) source = null;
    if (source) source.style.viewTransitionName = 'oeuvre'; // un seul élément porte ce nom à la fois

    var cible = null;
    var html = document.documentElement;
    html.setAttribute('data-vt', type);
    html.setAttribute('data-sens', String(sens));
    var t, mon = ++vtN;
    try {
      t = document.startViewTransition(function () {
        if (source) source.style.viewTransitionName = '';
        router(analyser() || r);
        if (type === 'filtre') { nommerCartes(true); return null; }
        // L'image qui fait la transition, si elle est déjà reçue, est montrée d'un coup (pas de fondu .att
        // par-dessus le glissement, qui la ferait pâlir) ; pas encore reçue : elle garde son fondu à l'arrivée
        var dispo = function (im) { if (im && im.complete && im.naturalWidth) montrerTout(im); };
        if (type === 'fiche') { nommerFiche(true); dispo($('.fi-zoom img', main)); return null; }
        if (!source) return null;
        cible = r.page === 'oeuvre' ? $('.fi-zoom img', main) : trouverImage(retourN);
        if (!cible) return null;
        cible.style.viewTransitionName = 'oeuvre';
        // On attend l'image prête (au plus 400 ms), sinon elle grandirait vide
        var c2 = cible;
        return Promise.race([c2.decode ? c2.decode().catch(noop) : null, attendre(400)]).then(function () { dispo(c2); });
      });
    } catch (e) { html.removeAttribute('data-vt'); html.removeAttribute('data-sens'); router(r); return; }
    var fin = function () {
      if (cible) cible.style.viewTransitionName = '';
      if (mon !== vtN) return; // une autre transition a commencé entre-temps : elle nettoiera
      html.removeAttribute('data-vt');
      html.removeAttribute('data-sens');
      nommerCartes(false);
      nommerFiche(false);
    };
    if (t.ready) t.ready.catch(noop);
    if (t.updateCallbackDone) t.updateCallbackDone.catch(noop);
    t.finished.then(fin, fin);
  }

  /* ---------- Menu plein écran (téléphone) ---------- */
  var menu = document.getElementById('menu');
  var btnMenu = document.getElementById('menu-btn');
  var btnFermer = document.getElementById('menu-x');
  function bloquer(oui) {
    var ouvert = oui || !menu.hidden || !visio.hidden || !!(msg && msg.open);
    document.documentElement.classList.toggle('bloque', ouvert);
    if (car && car.majPause) car.majPause(); // le tapis du téléphone s'arrête ou repart
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
    if (msg && msg.open) return; // la fenêtre du message gère Échap et le focus elle-même
    if (ev.key === 'Escape') {
      if (!visio.hidden) { fermerVisio(true); return; }
      if (!menu.hidden) { fermerMenu(true); return; }
    }
    if (ev.key === 'Tab') {
      if (!visio.hidden) { pieger(ev, visio); return; }
      if (!menu.hidden) { pieger(ev, menu); return; }
    }
    if ((ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') || !actuel || !visio.hidden || !menu.hidden ||
        ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
    var t = ev.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    var dir = ev.key === 'ArrowLeft' ? -1 : 1;
    // Accueil : ← → changent l'œuvre quand le héros est visible
    if (actuel.page === 'accueil' && car) { if (car.touche(dir)) ev.preventDefault(); return; }
    // Fiche œuvre : ← → pour passer à l'œuvre voisine
    if (actuel.page === 'oeuvre') {
      ev.preventDefault();
      sensFiche = { d: dir, t: Date.now() };
      location.hash = lienOeuvre(voisin(actuel.oeuvre, dir));
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

  /* ---------- V7 : bouton « Simulation » (pastille fixe en bas, à droite sur téléphone, à gauche sur ordinateur) ----------
     Bascule html.simu (le CSS montre les valeurs inventées ou les annotations), sans recharger la page :
     carrousel, tapis roulant et formulaire continuent. Mémorisé par appareil ; l'état est posé avant le premier
     affichage par le petit script en tête d'index.html. Cachée quand le menu, la visionneuse ou le message sont ouverts. */
  var CLE_SIMU = 'armel-proto-simulation';
  // Deux boutons : dans la barre du haut sur téléphone (immobile), pastille en bas à gauche dès 760 px
  $$('.simu-btn').forEach(function (btnSimu) {
    btnSimu.setAttribute('aria-pressed', String(simuOn()));
    appui(btnSimu, false);
    btnSimu.addEventListener('click', function () {
      var on = !simuOn();
      // Les textes changent de hauteur : on garde à sa place ce qu'on regarde. Repère = un petit bloc (paragraphe,
      // ligne, titre…) au tiers de l'écran, jamais un grand conteneur dont le haut ne bouge pas (Safari n'a pas
      // l'ancrage de défilement) ; entre deux blocs, on sonde un peu plus bas.
      var rep = null, y0 = 0;
      if (window.scrollY > 0 && document.elementFromPoint) {
        for (var yy = window.innerHeight / 3; !rep && yy < window.innerHeight * 0.75; yy += 20) {
          rep = document.elementFromPoint(window.innerWidth / 2, yy);
          rep = rep && rep.closest ? rep.closest('p, li, h1, h2, h3, h4, dt, dd, tr, figcaption, blockquote, label, summary, img') : null;
          while (rep && rep.closest('.ph, .phl, .sv, .av, .ex')) rep = rep.parentElement;
        }
        if (rep) y0 = rep.getBoundingClientRect().top;
      }
      document.documentElement.classList.toggle('simu', on);
      // Fiche : si la vue « Signature » affichée disparaît en simulation, on revient à l'œuvre entière
      var sigOuverte = $('.vue-b.sig-cache[aria-pressed="true"]', main), vue1 = $('.vue-b.vue1', main);
      if (on && sigOuverte && vue1) vue1.click();
      if (rep && document.contains(rep) && rep.getClientRects().length) {
        var dy = rep.getBoundingClientRect().top - y0;
        if (Math.abs(dy) >= 1) window.scrollTo(0, window.scrollY + dy);
      }
      $$('.simu-btn').forEach(function (b) { b.setAttribute('aria-pressed', String(on)); });
      // Menu déroulant du formulaire : « (vendue, exemple) » ou « (vendue) » (le CSS n'atteint pas le texte d'une option)
      $$('option[data-vendue]').forEach(function (op) { op.textContent = op.textContent.replace(/ \(vendue[^)]*\)$/, '') + libVendue(); });
      try { window.localStorage.setItem(CLE_SIMU, on ? '1' : '0'); } catch (e) { /* le site marche sans */ }
      var an = document.getElementById('annonce');
      if (an) an.textContent = on ? 'Simulation : informations inventées' : 'Annotations affichées';
    });
  });

  /* ---------- Message d'accueil de Dylan (fenêtre au milieu de l'écran) ----------
     Une fois par appareil (mémorisé), puis « Relire le message » dans le bandeau le rouvre.
     <dialog> + showModal : focus sur OK, Échap = OK, focus rendu, défilement bloqué.
     L'automatique du héros attend « OK » (apresMessage). Mouvement réduit : simple fondu. */
  var CLE_MESSAGE = 'armel-proto-message-vu';
  var msg = document.getElementById('msg');
  var msgCarte = $('.msg-carte', msg), msgFond = $('.msg-fond', msg), msgOk = document.getElementById('msg-ok');
  var msgVu = false;
  try { msgVu = window.localStorage.getItem(CLE_MESSAGE) === '1'; } catch (e) { /* stockage indisponible : montré à chaque visite */ }
  var messageAttendu = !!msg.showModal && !msgVu; // le message va s'ouvrir : l'automatique attend
  var fileMessage = [], msgRetour = null, msgFerme = false;
  function apresMessage(f) { if (messageAttendu) fileMessage.push(f); else f(); }
  function ouvrirMessage() {
    if (!msg.showModal || msg.open) return;
    msgRetour = document.activeElement;
    msgFerme = false;
    msgOk.classList.remove('appuye');
    msg.showModal();
    bloquer(true);
    msgOk.focus({ preventScroll: true });
    if (!msgCarte.animate) return;
    if (reduit()) { // simple fondu
      [msgFond, msgCarte].forEach(function (el) { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: E_UI }); });
      return;
    }
    // Fond qui s'assombrit et se floute, carte qui monte et grandit, lignes en cascade
    msgFond.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: E_UI });
    msgCarte.animate([{ opacity: 0, transform: 'translateY(24px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 700, easing: E_ENTREE });
    $$('.msg-l', msgCarte).forEach(function (el, i) {
      el.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
        { duration: 500, delay: 160 + i * 80, easing: E_ENTREE, fill: 'backwards' });
    });
  }
  // OK (ou Échap) : bouton enfoncé, puis la carte s'efface (300 ms)
  function fermerMessage() {
    if (!msg.open || msgFerme) return;
    msgFerme = true;
    try { window.localStorage.setItem(CLE_MESSAGE, '1'); } catch (e) { /* le site marche sans */ }
    var fin = function () { if (msg.open) msg.close(); };
    if (!msgCarte.animate) { fin(); return; }
    var r = reduit(), d = r ? 200 : 300, delai = r ? 0 : reglageCss('--fl-appui-duree');
    msgOk.classList.add('appuye');
    var a = msgCarte.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: r ? 'none' : 'scale(.98)' }], { duration: d, delay: delai, easing: E_UI, fill: 'forwards' });
    msgFond.animate([{ opacity: 1 }, { opacity: 0 }], { duration: d, delay: delai, easing: E_UI, fill: 'forwards' });
    a.finished.then(fin, fin);
  }
  // Fermeture réelle (OK, Échap, ou fermeture imposée par le navigateur) : on remet tout en ordre
  msg.addEventListener('close', function () {
    msgFerme = false;
    msgOk.classList.remove('appuye');
    [msgCarte, msgFond].forEach(function (el) { if (el.getAnimations) el.getAnimations().forEach(function (a) { a.cancel(); }); });
    try { window.localStorage.setItem(CLE_MESSAGE, '1'); } catch (e) { /* le site marche sans */ }
    bloquer(false);
    if (msgRetour && msgRetour !== document.body && document.contains(msgRetour)) msgRetour.focus({ preventScroll: true });
    else { var h1m = $('h1', main); if (h1m) h1m.focus({ preventScroll: true }); }  // rien n'avait le focus : on repart du titre de la page
    msgRetour = null;
    if (messageAttendu) {
      messageAttendu = false;
      var f = fileMessage; fileMessage = [];
      f.forEach(function (fn) { fn(); });
    }
  });
  msg.addEventListener('cancel', function (ev) { ev.preventDefault(); fermerMessage(); }); // Échap = OK
  msgOk.addEventListener('click', fermerMessage);
  msgOk.addEventListener('pointerdown', function (e) { if (e.button === 0) msgOk.classList.add('appuye'); });
  ['pointerleave', 'pointercancel'].forEach(function (t) { msgOk.addEventListener(t, function () { if (!msgFerme) msgOk.classList.remove('appuye'); }); });
  document.getElementById('proto-msg').addEventListener('click', ouvrirMessage);

  /* ---------- En-tête collant : verre dès qu'il colle en haut (classe utilisée par verre.css) ---------- */
  // Ordinateur seulement : sur téléphone et tablette, l'en-tête a un fond plein permanent (V6), rien à recalculer.
  var hdEl = document.getElementById('hd'), rafDefile = 0;
  function majDefile() {
    rafDefile = 0;
    document.documentElement.classList.toggle('hd-colle', mqOrdi.matches && window.scrollY > 0 && hdEl.getBoundingClientRect().top <= 0);
  }
  window.addEventListener('scroll', function () { if (mqOrdi.matches && !rafDefile) rafDefile = requestAnimationFrame(majDefile); }, { passive: true });
  if (mqOrdi.addEventListener) mqOrdi.addEventListener('change', majDefile);

  /* ---------- Redimensionnement ---------- */
  var minuterie = null;
  window.addEventListener('resize', function () {
    clearTimeout(minuterie);
    minuterie = setTimeout(function () {
      blocs.forEach(function (b) { if (document.body.contains(b.el)) { dessinerBloc(b); preparerImages(b.el); } });
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

  window.addEventListener('hashchange', naviguer);
  router();
  majDefile();

  // Première visite : le message s'ouvre après le chargement de l'image du héros (ou de l'image principale de la page)
  if (messageAttendu) {
    var pret = false;
    var montrer = function () {
      if (pret) return;
      pret = true;
      requestAnimationFrame(function () { setTimeout(ouvrirMessage, 150); });
    };
    var imP = $$('img[fetchpriority="high"]', main).filter(function (i) { return i.getBoundingClientRect().width > 0; })[0];
    if (imP) { quandCharge(imP, montrer); setTimeout(montrer, 3000); } // connexion lente : au plus 3 s
    else montrer();
  }
})();
