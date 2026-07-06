// ==========================================================
// accident.js
// Formulari d'accident per allau
// ==========================================================

let mapaAccident = null;
let gestorFotosAccident = null;

document.addEventListener("DOMContentLoaded", () => {
    registrarServiceWorker();

    mapaAccident = crearMapaICGC(
        "map",
        "coords-info",
        "btn-gps"
    );

    gestorFotosAccident = crearGestorFotos(
        "foto-camera",
        "foto-galeria",
        "preview-fotos"
    );

    posarDataAvui("data-accident");

    document.getElementById("btn-guardar").addEventListener("click", guardarAccident);
});

async function guardarAccident() {
    const coords = mapaAccident.getCoords();

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
        tipus: "accident",
        estat: "pendent",
        dataCreacio: new Date().toISOString(),

        localitzacio: {
            lat: coords.lat,
            lon: coords.lon,
            srid: 4326
        },

        dades: {
            lloc: lloc,
            dataAccident: obtenirValor("data-accident"),
            horaAccident: obtenirValor("hora-accident"),
            activitat: obtenirValor("activitat"),

            membresGrup: obtenirNumero("membres"),
            personesArrossegades: obtenirNumero("arrossegats"),
            colgatsCompletament: obtenirNumero("colgats-complets"),
            colgatsParcialment: obtenirNumero("colgats-parcials"),
            ferits: obtenirNumero("ferits"),
            morts: obtenirNumero("morts"),

            material: {
                arva: obtenirCheckbox("arva"),
                pala: obtenirCheckbox("pala"),
                sonda: obtenirCheckbox("sonda"),
                airbag: obtenirCheckbox("airbag")
            },

            tipusRescat: obtenirValor("rescat"),
            tempsRescatMinuts: obtenirNumero("temps-rescat"),

            mida: obtenirValor("mida"),
            tipusAllau: obtenirValor("tipus"),
            comentaris: obtenirValor("comentaris")
        },

        contacte: {
            nom: obtenirValor("nom"),
            telefon: obtenirValor("telefon"),
            email: obtenirValor("email")
        },

        fotos: gestorFotosAccident.getFotos()
    };

    await afegirRegistrePendent(registre);

    netejarFormulariAccident();

    alert("Accident guardat al dispositiu.");

    window.location.href = "index.html";
}

function netejarFormulariAccident() {
    const ids = [
        "lloc",
        "data-accident",
        "hora-accident",
        "activitat",
        "membres",
        "arrossegats",
        "colgats-complets",
        "colgats-parcials",
        "ferits",
        "morts",
        "rescat",
        "temps-rescat",
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

    const checkboxes = [
        "arva",
        "pala",
        "sonda",
        "airbag"
    ];

    checkboxes.forEach(id => {
        const element = document.getElementById(id);

        if (element) {
            element.checked = false;
        }
    });

    mapaAccident.reset();
    gestorFotosAccident.reset();

    posarDataAvui("data-accident");
}