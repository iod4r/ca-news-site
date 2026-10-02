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

  var ICONES = {
    clair:   '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="8" r="3.2"/><path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3.1 3.1l1.1 1.1M11.8 11.8l1.1 1.1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1"/></svg>',
    partiel: '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="5.5" cy="5.5" r="2.4"/><path d="M6.3 12.6h5.9a2.4 2.4 0 0 0 0-4.8 3.2 3.2 0 0 0-6.1.6 2.1 2.1 0 0 0 .2 4.2z"/></svg>',
    couvert: '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M4.4 12.4h7.4a2.6 2.6 0 0 0 0-5.2 3.5 3.5 0 0 0-6.8.7 2.3 2.3 0 0 0-.6 4.5z"/></svg>',
    brume:   '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M2 5.5h12M3.5 8.5h9M2 11.5h12"/></svg>',
    pluie:   '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M4.4 9.4h7.4a2.6 2.6 0 0 0 0-5.2 3.5 3.5 0 0 0-6.8.7 2.3 2.3 0 0 0-.6 4.5z"/><path d="M5.5 11.8l-.8 2M8 11.8l-.8 2M10.5 11.8l-.8 2"/></svg>',
    neige:   '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M4.4 9.4h7.4a2.6 2.6 0 0 0 0-5.2 3.5 3.5 0 0 0-6.8.7 2.3 2.3 0 0 0-.6 4.5z"/><path d="M5 12.8h.01M7.6 12.8h.01M10.2 12.8h.01M6.3 14.6h.01M8.9 14.6h.01" stroke-linecap="round" stroke-width="1.8"/></svg>',
    orage:   '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M4.4 9.4h7.4a2.6 2.6 0 0 0 0-5.2 3.5 3.5 0 0 0-6.8.7 2.3 2.3 0 0 0-.6 4.5z"/><path d="M8.6 11.2l-2 2.6h2l-1 2.2"/></svg>'
  };

  function glyphe(c) {
    if (c === 0)  return ICONES.clair;
    if (c <= 2)   return ICONES.partiel;
    if (c === 3)  return ICONES.couvert;
    if (c <= 48)  return ICONES.brume;
    if (c <= 67)  return ICONES.pluie;
    if (c <= 77)  return ICONES.neige;
    if (c <= 82)  return ICONES.pluie;
    if (c <= 86)  return ICONES.neige;
    return ICONES.orage;
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
              '<span class="meteo__nom">' + nom + '</span>' +
              '<span class="sep">\u2013</span>' +
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
