// ==========================================================
// observacio.js
// Formulari d'observació d'allau
// ==========================================================

let mapaObservacio = null;
let gestorFotosObservacio = null;

document.addEventListener("DOMContentLoaded", () => {
    registrarServiceWorker();

    mapaObservacio = crearMapaICGC(
        "map",
        "coords-info",
        "btn-gps"
    );

    gestorFotosObservacio = crearGestorFotos(
        "foto-camera",
        "foto-galeria",
        "preview-fotos"
    );

    posarDataAvui("data-observacio");

    document.getElementById("btn-guardar").addEventListener("click", guardarObservacio);
});

async function guardarObservacio() {
    const coords = mapaObservacio.getCoords();

    if (coords.lat === null || coords.lon === null) {
        alert("Has de seleccionar una ubicació al mapa.");
        return;
    }

    const lloc = obtenirValor("lloc");

    if (!lloc) {
        alert("Has d'indicar el lloc o sector.");
        return;
    }

    const registre = {
        idLocal: crearIdLocal(),
        tipus: "observacio",
        estat: "pendent",
        dataCreacio: new Date().toISOString(),

        localitzacio: {
            lat: coords.lat,
            lon: coords.lon,
            srid: 4326
        },

        dades: {
            lloc: lloc,
            dataObservacio: obtenirValor("data-observacio"),
            horaObservacio: obtenirValor("hora-observacio"),
            haVistCaure: obtenirValor("vista-caure"),
            mida: obtenirValor("mida"),
            tipusAllau: obtenirValor("tipus"),
            comentaris: obtenirValor("comentaris")
        },

        contacte: {
            nom: obtenirValor("nom"),
            telefon: obtenirValor("telefon"),
            email: obtenirValor("email")
        },

        fotos: gestorFotosObservacio.getFotos()
    };

    await afegirRegistrePendent(registre);

    netejarFormulariObservacio();

    alert("Observació guardada al dispositiu.");

    window.location.href = "index.html";
}

function netejarFormulariObservacio() {
    const ids = [
        "lloc",
        "data-observacio",
        "hora-observacio",
        "vista-caure",
        "mida",
        "tipus",
        "comentaris",
        "nom",
        "telefon",
        "email"
    ];

    ids.forEach(id => {
        const element = document.getElementById(id);

        if (element) {
            element.value = "";
        }
    });

    mapaObservacio.reset();
    gestorFotosObservacio.reset();

    posarDataAvui("data-observacio");
}