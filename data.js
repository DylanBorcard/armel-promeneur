/* Données du prototype — site d'Armel Promeneur.
   Rien n'est inventé sauf les champs marqués "exemple" (statut et prix),
   choisis par Dylan pour faire marcher les filtres (2026-11-07).
   Titres, années, techniques, dimensions : à fournir par Armel. */
window.SITE = {
  artiste: "Armel Promeneur",
  instagram: "https://www.instagram.com/promeneur_armel_studio/",
  instagramNom: "@promeneur_armel_studio",
  // Œuvres choisies pour l'accueil (même choix que la maquette du canevas)
  choisies: ["02", "18", "10", "23"],
  // Œuvre phare de l'accueil
  phare: "07",
  categories: [
    { id: "peintures", label: "Peintures", seul: "Peinture" },
    { id: "collages", label: "Collages", seul: "Collage" },
    { id: "sculptures", label: "Sculptures", seul: "Sculpture" },
    { id: "dessins", label: "Dessins", seul: "Dessin" }
  ],
  // n : numéro ; cat : catégorie ; type : libellé affiché ; w, h : taille de la photo (px) ;
  // statut et prix : EXEMPLES (fictifs), prix en CHF ; null = pas de prix affiché (vendue).
  oeuvres: [
    { n: "01", cat: "peintures",  type: "Peinture",            w: 1440, h: 1800, statut: "disponible", prix: 1200 },
    { n: "02", cat: "peintures",  type: "Peinture",            w: 1440, h: 1800, statut: "disponible", prix: 950 },
    { n: "03", cat: "peintures",  type: "Peinture",            w: 1440, h: 1787, statut: "vendue",     prix: null },
    { n: "04", cat: "peintures",  type: "Peinture",            w: 1440, h: 1800, statut: "disponible", prix: 1100 },
    { n: "05", cat: "peintures",  type: "Peinture",            w: 1440, h: 1440, statut: "disponible", prix: 850 },
    { n: "06", cat: "peintures",  type: "Peinture",            w: 1080, h: 1350, statut: "vendue",     prix: null },
    { n: "07", cat: "collages",   type: "Collage",             w: 1308, h: 1955, statut: "disponible", prix: 1800 },
    { n: "08", cat: "collages",   type: "Collage",             w: 1407, h: 2025, statut: "disponible", prix: 1200 },
    { n: "09", cat: "collages",   type: "Collage",             w: 1440, h: 1800, statut: "vendue",     prix: null },
    { n: "10", cat: "collages",   type: "Collage",             w: 1390, h: 1470, statut: "disponible", prix: 1500 },
    { n: "11", cat: "collages",   type: "Collage",             w: 1130, h: 1440, statut: "disponible", prix: 750 },
    { n: "12", cat: "collages",   type: "Collage",             w: 1080, h: 1350, statut: "disponible", prix: 1100 },
    { n: "13", cat: "collages",   type: "Collage",             w: 1080, h: 1350, statut: "vendue",     prix: null },
    { n: "14", cat: "collages",   type: "Collage",             w: 1080, h: 1350, statut: "disponible", prix: 1300 },
    { n: "15", cat: "sculptures", type: "Sculpture",           w: 1440, h: 1772, statut: "disponible", prix: 2400 },
    { n: "16", cat: "sculptures", type: "Sculpture",           w: 1440, h: 1800, statut: "vendue",     prix: null },
    { n: "17", cat: "sculptures", type: "Sculpture",           w: 1410, h: 1560, statut: "disponible", prix: 2800 },
    { n: "18", cat: "sculptures", type: "Sculpture",           w: 1080, h: 1198, statut: "disponible", prix: 1600 },
    { n: "19", cat: "sculptures", type: "Sculpture",           w: 1080, h: 1231, statut: "vendue",     prix: null },
    { n: "20", cat: "sculptures", type: "Sculpture",           w: 1080, h: 1350, statut: "disponible", prix: 2200 },
    { n: "21", cat: "sculptures", type: "Sculpture",           w: 1000, h: 1350, statut: "vendue",     prix: null },
    { n: "22", cat: "dessins",    type: "Dessin",              w: 1514, h: 2018, statut: "disponible", prix: 480 },
    { n: "23", cat: "dessins",    type: "Dessin",              w: 1080, h: 1350, statut: "vendue",     prix: null },
    { n: "24", cat: "sculptures", type: "Sculpture · textile", w: 700,  h: 1200, statut: "disponible", prix: 900 }
  ]
};
