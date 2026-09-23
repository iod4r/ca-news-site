/* Meteo des cinq capitales.
 *
 * Recuperee cote client, jamais a la generation : integrer la temperature
 * dans le HTML ferait changer les 700 pages a chaque passage du job, ce
 * qui detruirait la deduplication Git (0 fichier modifie -> tout modifie).
 *
 * Open-Meteo : gratuit, sans cle d'API, donc rien a cacher ici. Une seule
 * requete couvre les cinq villes.
 */
(function () {
  var hote = document.getElementById("meteo");
  if (!hote) return;

  var VILLES = [
    { slug: "kz", lat: 51.17, lon: 71.43 },
    { slug: "uz", lat: 41.31, lon: 69.24 },
    { slug: "kg", lat: 42.87, lon: 74.59 },
    { slug: "tj", lat: 38.56, lon: 68.79 },
    { slug: "tm", lat: 37.95, lon: 58.38 }
  ];

  // Codes WMO regroupes par famille. Tous les glyphes sont dans le plan
  // multilingue de base : pas d'emoji hors BMP, qui exigerait \u{...}.
  function glyphe(c) {
    if (c === 0) return "\u2600";      // clair
    if (c <= 2)  return "\u26C5";      // peu nuageux
    if (c === 3) return "\u2601";      // couvert
    if (c <= 48) return "\u2592";      // brouillard
    if (c <= 57) return "\u2602";      // bruine
    if (c <= 67) return "\u2614";      // pluie
    if (c <= 77) return "\u2744";      // neige
    if (c <= 82) return "\u2614";      // averses
    if (c <= 86) return "\u2744";      // averses de neige
    return "\u26A1";                   // orage
  }

  var CLE = "meteo-v1";
  var DUREE = 30 * 60 * 1000;   // la temperature ne bouge pas plus vite

  function lireCache() {
    try {
      var b = JSON.parse(localStorage.getItem(CLE));
      if (b && Date.now() - b.t < DUREE) return b.d;
    } catch (e) { /* stockage indisponible : on refait la requete */ }
    return null;
  }

  function ecrireCache(d) {
    try {
      localStorage.setItem(CLE, JSON.stringify({ t: Date.now(), d: d }));
    } catch (e) { /* quota ou navigation privee : sans consequence */ }
  }

  function afficher(temps) {
    var html = "";
    for (var i = 0; i < VILLES.length; i++) {
      var t = temps[i];
      if (!t) continue;
      var el = hote.querySelector('[data-ville="' + VILLES[i].slug + '"]');
      var nom = el ? el.getAttribute("data-nom") : VILLES[i].slug;
      html += '<span class="meteo__ville">' +
              '<span class="meteo__nom">' + nom + '</span> ' +
              '<span class="meteo__ciel">' + t.g + '</span> ' +
              '<span class="meteo__temp">' + t.c + '\u00B0</span></span>';
    }
    if (!html) return;
    hote.innerHTML = html;
    hote.hidden = false;
  }

  var cache = lireCache();
  if (cache) { afficher(cache); return; }

  var lat = VILLES.map(function (v) { return v.lat; }).join(",");
  var lon = VILLES.map(function (v) { return v.lon; }).join(",");
  var url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat +
            "&longitude=" + lon + "&current=temperature_2m,weather_code";

  fetch(url)
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function (d) {
      // Une seule ville renvoie un objet, plusieurs renvoient un tableau.
      var liste = Array.isArray(d) ? d : [d];
      var temps = liste.map(function (v) {
        if (!v || !v.current) return null;
        return {
          c: Math.round(v.current.temperature_2m),
          g: glyphe(v.current.weather_code)
        };
      });
      ecrireCache(temps);
      afficher(temps);
    })
    .catch(function () {
      /* Echec silencieux : le bandeau reste masque, aucun decalage de mise
         en page. La meteo est un agrement, pas une fonction du site. */
    });
})();
