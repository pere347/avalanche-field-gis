// ==========================================================
// common.js
// Funcions compartides per l'app UPAN
// ==========================================================

const STORAGE_KEY = "upan_registres_pendents";

// ----------------------------------------------------------
// Configuració de localForage
// ----------------------------------------------------------

localforage.config({
    name: "UPANAllausApp",
    storeName: "registres"
});

// ----------------------------------------------------------
// Crear ID local únic
// ----------------------------------------------------------

function crearIdLocal() {
    return "local_" + Date.now() + "_" + Math.random().toString(36).substring(2, 10);
}

// ----------------------------------------------------------
// Utilitats de formulari
// ----------------------------------------------------------

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

    const numero = Number(valor);

    if (Number.isNaN(numero)) {
        return null;
    }

    return numero;
}

function obtenirCheckbox(id) {
    const element = document.getElementById(id);

    if (!element) {
        return false;
    }

    return element.checked;
}

function posarDataAvui(idCampData) {
    const camp = document.getElementById(idCampData);

    if (!camp) {
        return;
    }

    if (!camp.value) {
        const avui = new Date().toISOString().split("T")[0];
        camp.value = avui;
    }
}

// ----------------------------------------------------------
// Guardar registres offline
// ----------------------------------------------------------

async function afegirRegistrePendent(registre) {
    const registres = await localforage.getItem(STORAGE_KEY) || [];
    registres.push(registre);
    await localforage.setItem(STORAGE_KEY, registres);
}

async function obtenirRegistresPendents() {
    return await localforage.getItem(STORAGE_KEY) || [];
}

async function guardarRegistresPendents(registres) {
    await localforage.setItem(STORAGE_KEY, registres);
}

async function esborrarTotsElsPendents() {
    await localforage.setItem(STORAGE_KEY, []);
}

// ----------------------------------------------------------
// Crear mapa Leaflet amb capes ICGC
// ----------------------------------------------------------

function crearMapaICGC(idMapa, idCoords, idBotoGPS) {
    let latSeleccionada = null;
    let lonSeleccionada = null;
    let marcador = null;

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

    const map = L.map(idMapa, {
        center: [42.4, 1.5],
        zoom: 8,
        layers: [icgcTopo]
    });

    L.control.layers(
        {
            "Topogràfic ICGC": icgcTopo,
            "Ortofoto ICGC": icgcOrto
        },
        null,
        {
            position: "topright"
        }
    ).addTo(map);

    setTimeout(() => {
        map.invalidateSize();
    }, 300);

    function actualitzarCoordsInfo(lat, lon) {
        const coordsDiv = document.getElementById(idCoords);

        if (!coordsDiv) {
            return;
        }

        coordsDiv.innerHTML = `
            <span class="coords-content">
                <img 
                    src="css/images/icons-svg/location-black.svg" 
                    alt="" 
                    class="icon-sm coords-icon"
                >
                <span>
                    Lat: <strong>${lat.toFixed(5)}</strong>, 
                    Lon: <strong>${lon.toFixed(5)}</strong>
                </span>
            </span>
        `;
    }

    function actualitzarMarcador(lat, lon, textPopup = "Ubicació seleccionada") {
        latSeleccionada = lat;
        lonSeleccionada = lon;

        actualitzarCoordsInfo(lat, lon);

        if (marcador) {
            map.removeLayer(marcador);
        }

        marcador = L.marker([lat, lon], {
            draggable: true
        }).addTo(map);

        marcador.bindPopup(textPopup).openPopup();

        marcador.on("dragend", () => {
            const pos = marcador.getLatLng();
            actualitzarMarcador(pos.lat, pos.lng, "Ubicació ajustada");
        });
    }

    map.on("click", event => {
        actualitzarMarcador(
            event.latlng.lat,
            event.latlng.lng,
            "Ubicació marcada manualment"
        );
    });

    const botoGPS = document.getElementById(idBotoGPS);

    if (botoGPS) {
        botoGPS.addEventListener("click", () => {
            if (!navigator.geolocation) {
                alert("Aquest dispositiu no suporta geolocalització.");
                return;
            }

            botoGPS.classList.add("loading");

            navigator.geolocation.getCurrentPosition(
                position => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;

                    map.setView([lat, lon], 15);
                    actualitzarMarcador(lat, lon, "La meva posició GPS");

                    botoGPS.classList.remove("loading");
                },
                error => {
                    console.error(error);
                    alert("No s'ha pogut obtenir la ubicació GPS.");
                    botoGPS.classList.remove("loading");
                },
                {
                    enableHighAccuracy: true,
                    timeout: 20000,
                    maximumAge: 0
                }
            );
        });
    }

    return {
        map,

        getCoords() {
            return {
                lat: latSeleccionada,
                lon: lonSeleccionada
            };
        },

        reset() {
            latSeleccionada = null;
            lonSeleccionada = null;

            const coordsDiv = document.getElementById(idCoords);

            if (coordsDiv) {
                coordsDiv.innerHTML = `
                    <span class="coords-content">
                        <img 
                            src="css/images/icons-svg/location-black.svg" 
                            alt="" 
                            class="icon-sm coords-icon"
                        >
                        <span>Cap ubicació seleccionada</span>
                    </span>
                `;
            }

            if (marcador) {
                map.removeLayer(marcador);
                marcador = null;
            }
        },

        setCoords(lat, lon, popup = "Ubicació seleccionada") {
            map.setView([lat, lon], 15);
            actualitzarMarcador(lat, lon, popup);
        }
    };
}

// ----------------------------------------------------------
// Fotografies
// ----------------------------------------------------------

function crearGestorFotos(idInputCamera, idInputGaleria, idPreview) {
    let fotos = [];

    const inputCamera = document.getElementById(idInputCamera);
    const inputGaleria = document.getElementById(idInputGaleria);
    const preview = document.getElementById(idPreview);

    function afegirFitxers(files) {
        if (!files || files.length === 0) {
            return;
        }

        Array.from(files).forEach(file => {
            if (!file.type.startsWith("image/")) {
                return;
            }

            comprimirImatge(file, 1280, 0.75)
                .then(fotoComprimida => {
                    fotos.push(fotoComprimida);
                    renderitzar();
                })
                .catch(error => {
                    console.error("Error comprimint la imatge:", error);
                    alert("No s'ha pogut processar la imatge.");
                });
        });
    }

    function renderitzar() {
        if (!preview) {
            return;
        }

        preview.innerHTML = "";

        fotos.forEach((fotoBase64, index) => {
            const wrapper = document.createElement("div");
            wrapper.className = "preview-img-wrapper";

            const img = document.createElement("img");
            img.src = fotoBase64;
            img.alt = "Fotografia seleccionada";

            const btnRemove = document.createElement("button");
            btnRemove.className = "btn-remove-foto";
            btnRemove.type = "button";
            btnRemove.innerText = "×";

            btnRemove.addEventListener("click", () => {
                fotos.splice(index, 1);
                renderitzar();
            });

            wrapper.appendChild(img);
            wrapper.appendChild(btnRemove);
            preview.appendChild(wrapper);
        });
    }

    if (inputCamera) {
        inputCamera.addEventListener("change", event => {
            afegirFitxers(event.target.files);
            inputCamera.value = "";
        });
    }

    if (inputGaleria) {
        inputGaleria.addEventListener("change", event => {
            afegirFitxers(event.target.files);
            inputGaleria.value = "";
        });
    }

    return {
        getFotos() {
            return fotos;
        },

        reset() {
            fotos = [];
            renderitzar();
        },

        setFotos(novesFotos) {
            fotos = novesFotos || [];
            renderitzar();
        }
    };
}

function comprimirImatge(file, maxAmplada = 1280, qualitat = 0.75) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = event => {
            const img = new Image();

            img.onload = () => {
                let amplada = img.width;
                let alcada = img.height;

                if (amplada > maxAmplada) {
                    const factor = maxAmplada / amplada;
                    amplada = maxAmplada;
                    alcada = Math.round(alcada * factor);
                }

                const canvas = document.createElement("canvas");
                canvas.width = amplada;
                canvas.height = alcada;

                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, amplada, alcada);

                const dataUrl = canvas.toDataURL("image/jpeg", qualitat);

                resolve(dataUrl);
            };

            img.onerror = () => {
                reject(new Error("No s'ha pogut carregar la imatge."));
            };

            img.src = event.target.result;
        };

        reader.onerror = () => {
            reject(new Error("No s'ha pogut llegir el fitxer."));
        };

        reader.readAsDataURL(file);
    });
}

// ----------------------------------------------------------
// Service Worker
// ----------------------------------------------------------

function registrarServiceWorker() {
    /*if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("sw.js")
                .then(() => {
                    console.log("Service Worker registrat correctament.");
                })
                .catch(error => {
                    console.error("Error registrant el Service Worker:", error);
                });
        });
    }*/
   console.log("Service Worker desactivat durant el desenvolupament.");
}