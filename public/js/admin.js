
import { adminLoadUsers, adminSetApproval, adminGetFamilyCode, adminSetFamilyCode, adminUsage14Days, adminExportFamily, adminSendApprovalEmail } from "./api.js";

export async function renderAdmin(container) {
  container.innerHTML="<p>Lade Nutzerverwaltung…</p>";
  const [users, code, usage]=await Promise.all([
    adminLoadUsers(),
    adminGetFamilyCode(),
    adminUsage14Days()
  ]);

  const groups = {
    pending: users.filter(x=>x.status==="pending"),
    approved: users.filter(x=>x.status==="approved"),
    blocked: users.filter(x=>["blocked","rejected"].includes(x.status))
  };

  container.innerHTML=`
  <section class="admin-section">
    <h2>Nutzerverwaltung</h2>
    <p>Konten, Freigaben und Profil-Verknüpfungen</p>
    <h3>Familientag-Code</h3>
    <div class="row">
      <input id="familyCode" value="${code?.code||""}" placeholder="Familientag-2026-…">
      <input id="familyValid" type="date" value="${code?.valid_until||""}">
      <button id="saveFamilyCode">Speichern</button>
    </div>

    <h3>Nutzung (letzte 14 Tage)</h3>
    <div class="usage-chart">${usage.map(x=>`<div><span>${x.day}</span><b>${x.count}</b></div>`).join("")||"Keine Daten"}</div>

    ${renderGroup("Offene Anträge",groups.pending,true)}
    ${renderGroup("Freigegebene Mitglieder",groups.approved,false)}
    ${renderGroup("Abgelehnt / gesperrt",groups.blocked,false)}
    <h3>Backup</h3>
    <button id="exportBackup">Vollständiges Familien-Backup herunterladen</button>
    <p class="hint">Backup enthält auch private Kontaktdaten. Sicher aufbewahren.</p>
    <p class="hint">Konten endgültig löschen geht im Supabase-Dashboard unter Authentication → Users. Sperren entzieht sofort den Zugriff.</p>
  </section>`;

  container.querySelector("#exportBackup")?.addEventListener("click", async () => {
    const data = await adminExportFamily();
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gossler-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
  });

  container.querySelector("#saveFamilyCode").onclick=async()=>{
    await adminSetFamilyCode(
      container.querySelector("#familyCode").value,
      container.querySelector("#familyValid").value || null
    );
    alert("Gespeichert.");
  };

  container.querySelectorAll("[data-approve]").forEach(btn=>btn.onclick=async()=>{
    const card=btn.closest("article"); const linked=card?.querySelector("[data-person-link]")?.value?.trim()||btn.dataset.person||null;
    await adminSetApproval(btn.dataset.approve,"approved","member",linked||null);
    try{await adminSendApprovalEmail(btn.dataset.approve);}catch(e){console.warn("Freigabe-Mail:",e);}
    await renderAdmin(container);
  });
  container.querySelectorAll("[data-block]").forEach(btn=>btn.onclick=async()=>{
    await adminSetApproval(btn.dataset.block,"blocked","member",null);
    await renderAdmin(container);
  });
}

function renderGroup(title,items,approve){
  return `<h3>${title}</h3><div class="admin-users">${
    items.map(x=>`<article><b>${x.display_name||x.email||x.user_id}</b>
      <small>${x.email||""} · ${x.role||"member"}</small>
      <div>${approve?`<label class="inline-link-field">Profil-ID<input data-person-link value="${x.person_id||""}" placeholder="UUID der Person"></label><button data-approve="${x.user_id}" data-person="${x.person_id||""}">Freigeben + Mail</button>`:""}
      <button data-block="${x.user_id}">Sperren</button></div>
    </article>`).join("") || "<p>Keine.</p>"
  }</div>`;
}
