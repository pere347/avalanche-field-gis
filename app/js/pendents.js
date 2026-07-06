// ==========================================================
// pendents.js
// Llistat i sincronització de registres pendents
// ==========================================================
let sincronitzacioEnCurs = false;

document.addEventListener("DOMContentLoaded", async () => {
    console.log("pendents.js carregat correctament");

    registrarServiceWorker();

    await carregarPendents();

    const botoSync = document.getElementById("btn-sync");

    if (botoSync) {
        console.log("Botó de sincronització trobat");
        botoSync.addEventListener("click", sincronitzarPendents);
    } else {
        console.error("No s'ha trobat el botó #btn-sync");
    }

    const botoEsborrarTots = document.getElementById("btn-esborrar-tots");

    if (botoEsborrarTots) {
        botoEsborrarTots.addEventListener("click", async () => {
            const confirmar = confirm("Segur que vols esborrar tots els registres pendents?");

            if (!confirmar) {
                return;
            }

            await esborrarTotsElsPendents();
            await carregarPendents();
        });
    }
});


async function carregarPendents() {
    const registres = await localforage.getItem("upan_registres_pendents") || [];

    console.log("Carregant pendents:", registres);

    const llista = document.getElementById("llista-pendents");
    const comptador = document.getElementById("comptador-pendents");

    comptador.innerText = registres.length;
    llista.innerHTML = "";

    if (registres.length === 0) {
        llista.innerHTML = `
            <section class="card">
                <p>No hi ha registres pendents.</p>
            </section>
        `;
        return;
    }

    registres.forEach((registre, index) => {
        const card = document.createElement("section");
        card.className = "registre";

        const tipusIcona = registre.tipus === "observacio"
            ? "css/images/icons-svg/location-black.svg"
            : "css/images/icons-svg/alert-black.svg";

        const tipusText = registre.tipus === "observacio"
            ? "Observació d’allau"
            : "Accident per allau";

        const lloc = registre.dades?.lloc || "Sense lloc";

        const dataCreacio = registre.dataCreacio
            ? new Date(registre.dataCreacio).toLocaleString()
            : "Sense data";

        const lat = registre.localitzacio?.lat;
        const lon = registre.localitzacio?.lon;

        const fotos = registre.fotos || [];

        card.innerHTML = `
            <div class="registre-title">
                <img src="${tipusIcona}" alt="" class="icon">
                <strong>${tipusText}</strong>
            </div>

            <div class="registre-meta">
                <div class="registre-meta-row">
                    <img src="css/images/icons-svg/location-black.svg" alt="" class="icon-sm">
                    <span><strong>Lloc:</strong> ${lloc}</span>
                </div>

                <div class="registre-meta-row">
                    <img src="css/images/icons-svg/calendar-black.svg" alt="" class="icon-sm">
                    <span><strong>Data:</strong> ${dataCreacio}</span>
                </div>

                <div class="registre-meta-row">
                    <img src="css/images/icons-svg/navigation-black.svg" alt="" class="icon-sm">
                    <span>
                        <strong>Coordenades:</strong>
                        ${typeof lat === "number" ? lat.toFixed(5) : "-"}, 
                        ${typeof lon === "number" ? lon.toFixed(5) : "-"}
                    </span>
                </div>

                <div class="registre-meta-row">
                    <img src="css/images/icons-svg/camera-black.svg" alt="" class="icon-sm">
                    <span><strong>Fotos:</strong> ${fotos.length}</span>
                </div>
            </div>

            <div class="registre-fotos">
                ${fotos.slice(0, 4).map(foto => `<img src="${foto}" alt="Foto del registre">`).join("")}
            </div>

            <div class="registre-accions">
                <button class="btn-small btn-delete" type="button" data-index="${index}">
                    <img src="css/images/icons-svg/delete-white.svg" alt="" class="icon-sm">
                    <span>Esborrar</span>
                </button>
            </div>
        `;

        llista.appendChild(card);
    });

    document.querySelectorAll(".btn-delete").forEach(boto => {
        boto.addEventListener("click", async () => {
            const index = Number(boto.dataset.index);
            await esborrarRegistrePendent(index);
        });
    });
}


async function esborrarRegistrePendent(index) {
    const registres = await obtenirRegistresPendents();

    const confirmar = confirm("Segur que vols esborrar aquest registre?");

    if (!confirmar) {
        return;
    }

    registres.splice(index, 1);

    await guardarRegistresPendents(registres);
    await carregarPendents();
}


async function sincronitzarPendents() {
    if (sincronitzacioEnCurs) {
        console.log("La sincronització ja està en curs. Clic ignorat.");
        return;
    }

    sincronitzacioEnCurs = true;

    const botoSync = document.getElementById("btn-sync");
    const textBoto = botoSync ? botoSync.querySelector("span") : null;

    // Fem una còpia dels registres abans de buidar localForage
    const registres = await localforage.getItem("upan_registres_pendents") || [];

    console.log("Registres pendents abans d'enviar:", registres);

    if (registres.length === 0) {
        sincronitzacioEnCurs = false;
        alert("No hi ha registres pendents per sincronitzar.");
        return;
    }

    try {
        if (botoSync) {
            botoSync.disabled = true;
            botoSync.classList.add("loading");
            botoSync.style.pointerEvents = "none";
        }

        if (textBoto) {
            textBoto.innerText = "Pujant dades i fotos...";
        }

        /*
            Sincronització optimista:
            buidem els pendents ABANS d'enviar.
            Si l'enviament falla, els restaurarem al catch.
        */
        await localforage.setItem("upan_registres_pendents", []);
        await carregarPendents();

        console.log("Pendents buidats abans d'enviar. Enviant còpia al servidor...");

        const resposta = await fetch(`${CONFIG.API_BASE_URL}/api/registres`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(registres)
        });

        console.log("Resposta HTTP:", resposta.status, resposta.statusText);

        if (!resposta.ok) {
            throw new Error("Error HTTP " + resposta.status);
        }

        const resultat = await resposta.json();
        console.log("Resposta del servidor:", resultat);

        if (resultat.ok !== true) {
            throw new Error("El servidor no ha retornat ok:true");
        }

        const comprovacio = await localforage.getItem("upan_registres_pendents");
        console.log("Comprovació final de pendents:", comprovacio);

        console.log(`Registres enviats correctament: ${resultat.rebuts || registres.length}`);

    } catch (error) {
        console.error("Error de sincronització:", error);

        // Si falla l'enviament, restaurem els pendents originals
        await localforage.setItem("upan_registres_pendents", registres);
        await carregarPendents();

        alert(
            "Error de sincronització: " +
            (error?.message || String(error)) +
            "\n\nEls registres s'han mantingut com a pendents."
        );

    } finally {
        sincronitzacioEnCurs = false;

        if (botoSync) {
            botoSync.disabled = false;
            botoSync.classList.remove("loading");
            botoSync.style.pointerEvents = "auto";
        }

        if (textBoto) {
            textBoto.innerText = "Sincronitzar amb servidor";
        }
    }
}