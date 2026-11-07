/* Meteo des six capitales.
 *
 * Recuperee cote client, jamais a la generation : integrer la temperature
 * dans le HTML ferait changer les 700 pages a chaque passage du job, ce
 * qui detruirait la deduplication Git (0 fichier modifie -> tout modifie).
 *
 * Open-Meteo : gratuit, sans cle d'API, donc rien a cacher ici. Une seule
 * requete couvre les six villes.
 *
 * Emojis en couleur, avec une variante de nuit quand Open-Meteo signale
 * is_day = 0 : a 2 h a Tachkent, un soleil est faux. Chaque emoji porte
 * un libelle dans la langue de la page, pour les lecteurs d'ecran et
 * l'infobulle.
 */
(function () {
  var hote = document.getElementById("meteo");
  if (!hote) return;

  var VILLES = [
    { slug: "kz", lat: 51.17, lon: 71.43 },
    { slug: "uz", lat: 41.31, lon: 69.24 },
    { slug: "kg", lat: 42.87, lon: 74.59 },
    { slug: "tj", lat: 38.56, lon: 68.79 },
    { slug: "tm", lat: 37.95, lon: 58.38 },
    { slug: "af", lat: 34.53, lon: 69.17 }
  ];

  // [jour, nuit] ; une seule valeur quand le ciel est le meme de nuit.
  var EMOJI = {
    clair:   ["☀️", "🌙"],        // soleil / lune
    partiel: ["⛅", "☁️"],              // soleil voile / nuage
    couvert: ["☁️"],                        // nuage
    brume:   ["🌫️"],                  // brouillard
    bruine:  ["🌦️", "🌧️"], // soleil et pluie / pluie
    pluie:   ["🌧️"],                  // nuage de pluie
    averse:  ["🌧️"],
    verglas: ["🌧️"],
    neige:   ["🌨️"],                  // nuage de neige
    orage:   ["⛈️"],                        // orage
    grele:   ["⛈️"]
  };

  var MOTS = {
    en: { clair: "Clear", partiel: "Partly cloudy", couvert: "Overcast", brume: "Fog",
          bruine: "Drizzle", pluie: "Rain", averse: "Heavy rain", verglas: "Freezing rain",
          neige: "Snow", orage: "Thunderstorm", grele: "Thunderstorm with hail" },
    fr: { clair: "Dégagé", partiel: "Éclaircies", couvert: "Couvert", brume: "Brouillard",
          bruine: "Bruine", pluie: "Pluie", averse: "Fortes pluies", verglas: "Pluie verglaçante",
          neige: "Neige", orage: "Orage", grele: "Orage de grêle" },
    ru: { clair: "Ясно", partiel: "Переменная облачность", couvert: "Пасмурно", brume: "Туман",
          bruine: "Морось", pluie: "Дождь", averse: "Сильный дождь", verglas: "Ледяной дождь",
          neige: "Снег", orage: "Гроза", grele: "Гроза с градом" },
    uz: { clair: "Ochiq", partiel: "Qisman bulutli", couvert: "Bulutli", brume: "Tuman",
          bruine: "Mayda yomgʻir", pluie: "Yomgʻir", averse: "Kuchli yomgʻir", verglas: "Muzli yomgʻir",
          neige: "Qor", orage: "Momaqaldiroq", grele: "Doʻl bilan momaqaldiroq" },
    kk: { clair: "Ашық", partiel: "Бұлтты, ашық аралас", couvert: "Бұлыңғыр", brume: "Тұман",
          bruine: "Сіркіреме", pluie: "Жаңбыр", averse: "Нөсер", verglas: "Мұзды жаңбыр",
          neige: "Қар", orage: "Найзағай", grele: "Бұршақты найзағай" },
    zh: { clair: "晴", partiel: "多云", couvert: "阴", brume: "雾",
          bruine: "毛毛雨", pluie: "雨", averse: "大雨", verglas: "冻雨",
          neige: "雪", orage: "雷暴", grele: "雷暴伴有冰雹" }
  };
  var mots = MOTS[(document.documentElement.lang || "en").slice(0, 2)] || MOTS.en;

  // Codes WMO, tels qu'Open-Meteo les renvoie.
  function etat(c) {
    if (c === 0) return "clair";
    if (c <= 2) return "partiel";
    if (c === 3) return "couvert";
    if (c === 45 || c === 48) return "brume";
    if (c >= 51 && c <= 55) return "bruine";
    if (c === 56 || c === 57 || c === 66 || c === 67) return "verglas";
    if (c === 61 || c === 63 || c === 80 || c === 81) return "pluie";
    if (c === 65 || c === 82) return "averse";
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return "neige";
    if (c === 95) return "orage";
    if (c === 96 || c === 99) return "grele";
    return "couvert";
  }

  function glyphe(code, jour) {
    var e = etat(code), v = EMOJI[e];
    var nom = mots[e];
    return '<span class="meteo__emoji" role="img" aria-label="' + nom +
           '" title="' + nom + '">' + (jour || v.length < 2 ? v[0] : v[1]) + '</span>';
  }

  // v2 : le cache garde les codes et non plus le dessin, pour que l'emoji
  // suive la langue de la page et les retouches futures.
  var CLE = "meteo-v2";
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
      if (!el) continue;              // capitale absente du gabarit
      html += '<span class="meteo__ville">' +
              '<span class="meteo__nom">' + el.getAttribute("data-nom") + '</span>' +
              '<span class="sep">–</span>' +
              '<span class="meteo__ciel">' + glyphe(t.w, t.j) + '</span>' +
              '<span class="meteo__temp">' + t.c + '°</span></span>';
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
            "&longitude=" + lon + "&current=temperature_2m,weather_code,is_day";

  fetch(url)
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function (d) {
      // Une seule ville renvoie un objet, plusieurs renvoient un tableau.
      var liste = Array.isArray(d) ? d : [d];
      var temps = liste.map(function (v) {
        if (!v || !v.current) return null;
        var c = Math.round(v.current.temperature_2m);
        return {
          c: c === 0 ? 0 : c,          // jamais « -0° »
          w: v.current.weather_code,
          j: v.current.is_day !== 0
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
