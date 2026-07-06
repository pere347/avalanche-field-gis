// ==========================================================
// UPAN | Comunicació d'allaus
// Primera versió funcional
// ==========================================================

const STORAGE_KEY = "upan_registres_pendents";

let mapObservacio = null;
let mapAccident = null;

let markerObservacio = null;
let markerAccident = null;

let coordsObservacio = {
    lat: null,
    lon: null
};

let coordsAccident = {
    lat: null,
    lon: null
};

let fotosObservacio = [];
let fotosAccident = [];

// ----------------------------------------------------------
// Inicialització general
// ----------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    configurarLocalForage();
    configurarNavegacio();
    configurarFotos();
    configurarBotonsGuardar();
    configurarPendents();
    registrarServiceWorker();

    posarDataAvui();
});

// ----------------------------------------------------------
// Configuració localForage
// ----------------------------------------------------------

function configurarLocalForage() {
    localforage.config({
        name: "UPANAllausApp",
        storeName: "registres"
    });
}

// ----------------------------------------------------------
// Navegació entre pantalles
// ----------------------------------------------------------

function configurarNavegacio() {
    document.getElementById("btn-go-observacio").addEventListener("click", () => {
        mostrarPantalla("screen-observacio");
        inicialitzarMapaObservacio();
    });

    document.getElementById("btn-go-accident").addEventListener("click", () => {
        mostrarPantalla("screen-accident");
        inicialitzarMapaAccident();
    });

    document.getElementById("btn-go-pendents").addEventListener("click", async () => {
        mostrarPantalla("screen-pendents");
        await carregarPendents();
    });

    document.querySelectorAll(".btn-back").forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.dataset.target;
            mostrarPantalla(target);
        });
    });
}

function mostrarPantalla(idPantalla) {
    document.querySelectorAll(".screen").forEach(screen => {
        screen.classList.remove("active");
    });

    document.getElementById(idPantalla).classList.add("active");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    setTimeout(() => {
        if (mapObservacio) {
            mapObservacio.invalidateSize();
        }

        if (mapAccident) {
            mapAccident.invalidateSize();
        }
    }, 300);
}

// ----------------------------------------------------------
// Mapes Leaflet
// ----------------------------------------------------------

function crearCapesBase() {
    const icgcTopo = L.tileLayer(
        "https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wmts/topografic/MON3857NW/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution: "© ICGC"
        }
    );

    const icgcOrto = L.tileLayer(
        "https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wmts/orto/MON3857NW/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution: "© ICGC"
        }
    );

    return {
        icgcTopo,
        icgcOrto
    };
}

function inicialitzarMapaObservacio() {
    if (mapObservacio) {
        setTimeout(() => mapObservacio.invalidateSize(), 300);
        return;
    }

    const capes = crearCapesBase();

    mapObservacio = L.map("map-observacio", {
        center: [42.4, 1.5],
        zoom: 8,
        layers: [capes.icgcTopo]
    });

    L.control.layers(
        {
            "Topogràfic ICGC": capes.icgcTopo,
            "Ortofoto ICGC": capes.icgcOrto
        },
        null,
        {
            position: "topright"
        }
    ).addTo(mapObservacio);

    mapObservacio.on("click", event => {
        actualitzarMarcadorObservacio(
            event.latlng.lat,
            event.latlng.lng,
            "Ubicació marcada manualment"
        );
    });

    document.getElementById("btn-gps-observacio").addEventListener("click", () => {
        centrarAmbGPS("observacio");
    });

    setTimeout(() => mapObservacio.invalidateSize(), 300);
}

function inicialitzarMapaAccident() {
    if (mapAccident) {
        setTimeout(() => mapAccident.invalidateSize(), 300);
        return;
    }

    const capes = crearCapesBase();

    mapAccident = L.map("map-accident", {
        center: [42.4, 1.5],
        zoom: 8,
        layers: [capes.icgcTopo]
    });

    L.control.layers(
        {
            "Topogràfic ICGC": capes.icgcTopo,
            "Ortofoto ICGC": capes.icgcOrto
        },
        null,
        {
            position: "topright"
        }
    ).addTo(mapAccident);

    mapAccident.on("click", event => {
        actualitzarMarcadorAccident(
            event.latlng.lat,
            event.latlng.lng,
            "Ubicació marcada manualment"
        );
    });

    document.getElementById("btn-gps-accident").addEventListener("click", () => {
        centrarAmbGPS("accident");
    });

    setTimeout(() => mapAccident.invalidateSize(), 300);
}

function actualitzarMarcadorObservacio(lat, lon, textPopup) {
    coordsObservacio.lat = lat;
    coordsObservacio.lon = lon;

    const coordsDiv = document.getElementById("coords-observacio");
    coordsDiv.innerHTML = `✅ Lat: <strong>${lat.toFixed(5)}</strong>, Lon: <strong>${lon.toFixed(5)}</strong>`;

    if (markerObservacio) {
        mapObservacio.removeLayer(markerObservacio);
    }

    markerObservacio = L.marker([lat, lon], {
        draggable: true
    }).addTo(mapObservacio);

    markerObservacio.bindPopup(textPopup).openPopup();

    markerObservacio.on("dragend", () => {
        const pos = markerObservacio.getLatLng();
        actualitzarMarcadorObservacio(pos.lat, pos.lng, "Ubicació ajustada");
    });
}

function actualitzarMarcadorAccident(lat, lon, textPopup) {
    coordsAccident.lat = lat;
    coordsAccident.lon = lon;

    const coordsDiv = document.getElementById("coords-accident");
    coordsDiv.innerHTML = `✅ Lat: <strong>${lat.toFixed(5)}</strong>, Lon: <strong>${lon.toFixed(5)}</strong>`;

    if (markerAccident) {
        mapAccident.removeLayer(markerAccident);
    }

    markerAccident = L.marker([lat, lon], {
        draggable: true
    }).addTo(mapAccident);

    markerAccident.bindPopup(textPopup).openPopup();

    markerAccident.on("dragend", () => {
        const pos = markerAccident.getLatLng();
        actualitzarMarcadorAccident(pos.lat, pos.lng, "Ubicació ajustada");
    });
}

function centrarAmbGPS(tipus) {
    if (!navigator.geolocation) {
        alert("Aquest dispositiu no suporta geolocalització.");
        return;
    }

    const boto = tipus === "observacio"
        ? document.getElementById("btn-gps-observacio")
        : document.getElementById("btn-gps-accident");

    boto.innerText = "⏳";

    navigator.geolocation.getCurrentPosition(
        position => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            if (tipus === "observacio") {
                mapObservacio.setView([lat, lon], 15);
                actualitzarMarcadorObservacio(lat, lon, "La meva posició GPS");
            }

            if (tipus === "accident") {
                mapAccident.setView([lat, lon], 15);
                actualitzarMarcadorAccident(lat, lon, "La meva posició GPS");
            }

            boto.innerText = "🎯";
        },
        error => {
            console.error(error);
            alert("No s'ha pogut obtenir la ubicació GPS.");
            boto.innerText = "🎯";
        },
        {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 0
        }
    );
}

// ----------------------------------------------------------
// Fotografies
// ----------------------------------------------------------

function configurarFotos() {
    document.getElementById("obs-fotos").addEventListener("change", event => {
        llegirFotos(event.target.files, fotosObservacio, "preview-observacio");
        event.target.value = "";
    });

    document.getElementById("acc-fotos").addEventListener("change", event => {
        llegirFotos(event.target.files, fotosAccident, "preview-accident");
        event.target.value = "";
    });
}

function llegirFotos(files, arrayFotos, idPreview) {
    if (!files || files.length === 0) {
        return;
    }

    Array.from(files).forEach(file => {
        if (!file.type.startsWith("image/")) {
            return;
        }

        const reader = new FileReader();

        reader.onload = event => {
            arrayFotos.push(event.target.result);
            renderitzarFotos(arrayFotos, idPreview);
        };

        reader.readAsDataURL(file);
    });
}

function renderitzarFotos(arrayFotos, idPreview) {
    const container = document.getElementById(idPreview);
    container.innerHTML = "";

    arrayFotos.forEach((fotoBase64, index) => {
        const wrapper = document.createElement("div");
        wrapper.className = "preview-img-wrapper";

        const img = document.createElement("img");
        img.src = fotoBase64;
        img.alt = "Fotografia seleccionada";

        const btnRemove = document.createElement("button");
        btnRemove.className = "btn-remove-foto";
        btnRemove.innerText = "×";

        btnRemove.addEventListener("click", () => {
            arrayFotos.splice(index, 1);
            renderitzarFotos(arrayFotos, idPreview);
        });

        wrapper.appendChild(img);
        wrapper.appendChild(btnRemove);
        container.appendChild(wrapper);
    });
}

// ----------------------------------------------------------
// Guardar registres offline
// ----------------------------------------------------------

function configurarBotonsGuardar() {
    document.getElementById("btn-guardar-observacio").addEventListener("click", guardarObservacio);
    document.getElementById("btn-guardar-accident").addEventListener("click", guardarAccident);
}

async function guardarObservacio() {
    if (coordsObservacio.lat === null || coordsObservacio.lon === null) {
        alert("Has de seleccionar una ubicació al mapa.");
        return;
    }

    const lloc = obtenirValor("obs-lloc");

    if (!lloc) {
        alert("Has d'indicar el lloc o sector.");
        return;
    }

    const registre = {
        idLocal: crearIdLocal(),
        tipus: "observacio",
        dataCreacio: new Date().toISOString(),
        estat: "pendent",

        localitzacio: {
            lat: coordsObservacio.lat,
            lon: coordsObservacio.lon,
            srid: 4326
        },

        dades: {
            lloc: lloc,
            dataObservacio: obtenirValor("obs-data"),
            horaObservacio: obtenirValor("obs-hora"),
            haVistCaure: obtenirValor("obs-vista-caure"),
            mida: obtenirValor("obs-mida"),
            tipusAllau: obtenirValor("obs-tipus"),
            comentaris: obtenirValor("obs-comentaris")
        },

        contacte: {
            nom: obtenirValor("obs-nom"),
            telefon: obtenirValor("obs-telefon"),
            email: obtenirValor("obs-email")
        },

        fotos: fotosObservacio
    };

    await afegirRegistrePendent(registre);
    netejarFormulariObservacio();

    alert("✅ Observació guardada al dispositiu.");
    mostrarPantalla("screen-home");
}

async function guardarAccident() {
    if (coordsAccident.lat === null || coordsAccident.lon === null) {
        alert("Has de seleccionar una ubicació al mapa.");
        return;
    }

    const lloc = obtenirValor("acc-lloc");

    if (!lloc) {
        alert("Has d'indicar el lloc o sector.");
        return;
    }

    const registre = {
        idLocal: crearIdLocal(),
        tipus: "accident",
        dataCreacio: new Date().toISOString(),
        estat: "pendent",

        localitzacio: {
            lat: coordsAccident.lat,
            lon: coordsAccident.lon,
            srid: 4326
        },

        dades: {
            lloc: lloc,
            dataAccident: obtenirValor("acc-data"),
            horaAccident: obtenirValor("acc-hora"),
            activitat: obtenirValor("acc-activitat"),

            membresGrup: obtenirNumero("acc-membres"),
            personesArrossegades: obtenirNumero("acc-arrossegats"),
            colgatsCompletament: obtenirNumero("acc-colgats-complets"),
            colgatsParcialment: obtenirNumero("acc-colgats-parcials"),
            ferits: obtenirNumero("acc-ferits"),
            morts: obtenirNumero("acc-morts"),

            material: {
                arva: obtenirCheckbox("acc-arva"),
                pala: obtenirCheckbox("acc-pala"),
                sonda: obtenirCheckbox("acc-sonda"),
                airbag: obtenirCheckbox("acc-airbag")
            },

            tipusRescat: obtenirValor("acc-rescat"),
            tempsRescatMinuts: obtenirNumero("acc-temps-rescat"),

            mida: obtenirValor("acc-mida"),
            tipusAllau: obtenirValor("acc-tipus"),
            comentaris: obtenirValor("acc-comentaris")
        },

        contacte: {
            nom: obtenirValor("acc-nom"),
            telefon: obtenirValor("acc-telefon"),
            email: obtenirValor("acc-email")
        },

        fotos: fotosAccident
    };

    await afegirRegistrePendent(registre);
    netejarFormulariAccident();

    alert("✅ Accident guardat al dispositiu.");
    mostrarPantalla("screen-home");
}

async function afegirRegistrePendent(registre) {
    const registres = await localforage.getItem(STORAGE_KEY) || [];
    registres.push(registre);
    await localforage.setItem(STORAGE_KEY, registres);
}

function obtenirValor(id) {
    const element = document.getElementById(id);

    if (!element) {
        return "";
    }

    return element.value.trim();
}

function obtenirNumero(id) {
    const valor = obtenirValor(id);

    if (valor === "") {
        return null;
    }

    return Number(valor);
}

function obtenirCheckbox(id) {
    const element = document.getElementById(id);
    return element ? element.checked : false;
}

function crearIdLocal() {
    return "local_" + Date.now() + "_" + Math.random().toString(36).substring(2, 10);
}

// ----------------------------------------------------------
// Netejar formularis
// ----------------------------------------------------------

function netejarFormulariObservacio() {
    const ids = [
        "obs-lloc",
        "obs-data",
        "obs-hora",
        "obs-vista-caure",
        "obs-mida",
        "obs-tipus",
        "obs-comentaris",
        "obs-nom",
        "obs-telefon",
        "obs-email"
    ];

    ids.forEach(id => {
        document.getElementById(id).value = "";
    });

    coordsObservacio.lat = null;
    coordsObservacio.lon = null;
    fotosObservacio = [];

    document.getElementById("coords-observacio").innerHTML = "🗺️ Cap ubicació seleccionada";
    document.getElementById("preview-observacio").innerHTML = "";

    if (markerObservacio) {
        mapObservacio.removeLayer(markerObservacio);
        markerObservacio = null;
    }

    posarDataAvui();
}

function netejarFormulariAccident() {
    const idsText = [
        "acc-lloc",
        "acc-data",
        "acc-hora",
        "acc-activitat",
        "acc-membres",
        "acc-arrossegats",
        "acc-colgats-complets",
        "acc-colgats-parcials",
        "acc-ferits",
        "acc-morts",
        "acc-rescat",
        "acc-temps-rescat",
        "acc-mida",
        "acc-tipus",
        "acc-comentaris",
        "acc-nom",
        "acc-telefon",
        "acc-email"
    ];

    idsText.forEach(id => {
        document.getElementById(id).value = "";
    });

    const idsCheckbox = [
        "acc-arva",
        "acc-pala",
        "acc-sonda",
        "acc-airbag"
    ];

    idsCheckbox.forEach(id => {
        document.getElementById(id).checked = false;
    });

    coordsAccident.lat = null;
    coordsAccident.lon = null;
    fotosAccident = [];

    document.getElementById("coords-accident").innerHTML = "🗺️ Cap ubicació seleccionada";
    document.getElementById("preview-accident").innerHTML = "";

    if (markerAccident) {
        mapAccident.removeLayer(markerAccident);
        markerAccident = null;
    }

    posarDataAvui();
}

// ----------------------------------------------------------
// Registres pendents
// ----------------------------------------------------------

function configurarPendents() {
    document.getElementById("btn-esborrar-tots").addEventListener("click", async () => {
        const confirmar = confirm("Segur que vols esborrar tots els registres pendents?");

        if (!confirmar) {
            return;
        }

        await localforage.removeItem(STORAGE_KEY);
        await carregarPendents();
    });
}

async function carregarPendents() {
    const registres = await localforage.getItem(STORAGE_KEY) || [];

    const llista = document.getElementById("llista-pendents");
    const comptador = document.getElementById("comptador-pendents");

    comptador.innerText = registres.length;
    llista.innerHTML = "";

    if (registres.length === 0) {
        llista.innerHTML = `
            <div class="card">
                <p>No hi ha registres pendents.</p>
            </div>
        `;
        return;
    }

    registres.forEach((registre, index) => {
        const div = document.createElement("div");
        div.className = "registre";

        const tipusText = registre.tipus === "observacio"
            ? "🏔️ Observació d’allau"
            : "🚨 Accident per allau";

        const lloc = registre.dades?.lloc || "Sense lloc";
        const data = registre.dataCreacio
            ? new Date(registre.dataCreacio).toLocaleString()
            : "Sense data";

        const lat = registre.localitzacio?.lat;
        const lon = registre.localitzacio?.lon;

        const fotos = registre.fotos || [];

        div.innerHTML = `
            <strong>${tipusText}</strong>
            <div class="registre-meta">
                ${lloc}<br>
                ${data}<br>
                Lat: ${lat?.toFixed ? lat.toFixed(5) : "-"}, Lon: ${lon?.toFixed ? lon.toFixed(5) : "-"}<br>
                Fotos: ${fotos.length}
            </div>

            <div class="registre-fotos">
                ${fotos.slice(0, 4).map(foto => `<img src="${foto}" alt="Foto del registre">`).join("")}
            </div>

            <div class="registre-accions">
                <button class="btn-small btn-delete" data-index="${index}">
                    🗑️ Esborrar
                </button>
            </div>
        `;

        llista.appendChild(div);
    });

    document.querySelectorAll(".btn-delete").forEach(btn => {
        btn.addEventListener("click", async () => {
            const index = Number(btn.dataset.index);
            await esborrarRegistre(index);
        });
    });
}

async function esborrarRegistre(index) {
    const registres = await localforage.getItem(STORAGE_KEY) || [];

    registres.splice(index, 1);

    await localforage.setItem(STORAGE_KEY, registres);
    await carregarPendents();
}

// ----------------------------------------------------------
// Altres utilitats
// ----------------------------------------------------------

function posarDataAvui() {
    const avui = new Date().toISOString().split("T")[0];

    const obsData = document.getElementById("obs-data");
    const accData = document.getElementById("acc-data");

    if (obsData && !obsData.value) {
        obsData.value = avui;
    }

    if (accData && !accData.value) {
        accData.value = avui;
    }
}

// ----------------------------------------------------------
// Service Worker
// ----------------------------------------------------------

function registrarServiceWorker() {
    if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("sw.js")
                .then(() => {
                    console.log("Service Worker registrat correctament.");
                })
                .catch(error => {
                    console.error("Error registrant el Service Worker:", error);
                });
        });
    }
}