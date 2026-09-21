
import { CONFIG } from "./config.js";
import { state, setState } from "./state.js";
import { restoreAccess, signIn, signUp, requestPasswordReset, updatePassword, enterGuestMode, signOut } from "./auth.js";
import { loadFamily, getMyProfile, setProfilePerson, createMyPerson, redeemFamilyCode, trackUsage } from "./api.js";
import { roots } from "./tree.js";
import Views from "./views.js";
import { openProfile } from "./profile.js";
import { addRelation } from "./api.js";
import { showQrModal, startQrScanner } from "./qr.js";
import { renderAdmin } from "./admin.js";
import { indexGraph, relationshipSummary } from "./relationship.js";

const app=document.querySelector("#app");
const $=(q,r=document)=>r.querySelector(q);

function page(html){ app.innerHTML=html; }
function familyName(p){return [p?.first_name,p?.last_name].filter(Boolean).join(" ");}

async function init(){
  if(CONFIG.privacy.robotsNoIndex){
    document.querySelector('meta[name="robots"]')?.setAttribute("content","noindex,nofollow,noarchive");
  }

  try{
    const access=await restoreAccess();
    if(access==="none") return showLogin();
    if(access==="pending") return showPending();
    await enterFamily();
  }catch(err){
    console.error(err); showLogin(err.message);
  }
}

function authShell(body){
  return `<main class="auth-shell"><section class="auth-card">
    <div class="crests"><div class="crest crest-full"><img src="./assets/wappen-gossler.png" alt="Familienwappen Goßler"></div></div>
    <h1>${CONFIG.family.title}</h1><h2>${CONFIG.family.subtitle}</h2>
    ${body}
    <footer>Feedback: ${CONFIG.family.contactEmail} · <button class="link-button" data-privacy>Datenschutz</button></footer>
  </section></main>`;
}

function showLogin(message=""){
  page(authShell(`
    ${message?`<div class="error">${message}</div>`:""}
    <form id="loginForm">
      <label>E-Mail<input name="email" type="email" placeholder="name@beispiel.de" required></label>
      <label>Passwort<input name="password" type="password" placeholder="••••••••" required></label>
      <button type="submit">Anmelden</button>
    </form>
    <button class="link-button" id="forgot">Passwort vergessen?</button>
    <p>Noch kein Konto? <button class="link-button" id="register">Registrieren</button></p>
    <div class="separator">oder</div>
    <button id="guestMode">Familientag: Ohne Konto ansehen</button>
    <p class="hint">Stammbaum ansehen & Verwandtschaft entdecken – ganz ohne Registrierung. Du brauchst nur den Familientag-Code.</p>
  `));

  $("#loginForm").onsubmit=async e=>{
    e.preventDefault();
    const fd=new FormData(e.currentTarget);
    try{await signIn(fd.get("email"),fd.get("password")); await init();}
    catch(err){showLogin(err.message);}
  };
  $("#register").onclick=showRegister;
  $("#forgot").onclick=showForgot;
  $("#guestMode").onclick=showGuest;
  $("[data-privacy]").onclick=showPrivacy;
}

function showForgot(){
  page(authShell(`<p>Gib deine E-Mail-Adresse ein. Du erhältst einen Link zum Zurücksetzen deines Passworts.</p>
    <form id="forgotForm"><label>E-Mail<input name="email" type="email" required></label><button>Link senden</button></form>
    <button class="link-button" id="back">Zurück zur Anmeldung</button>`));
  $("#forgotForm").onsubmit=async e=>{e.preventDefault();await requestPasswordReset(new FormData(e.currentTarget).get("email"));alert("Link versendet.");};
  $("#back").onclick=showLogin;
}

function showRegister(){
  page(authShell(`<form id="registerForm">
    <label>Vorname<input name="firstName" placeholder="Max" required></label>
    <label>Nachname<input name="lastName" placeholder="Goßler" required></label>
    <label>Geburtsname (falls abweichend)<input name="birthName" placeholder="geb. ..."></label>
    <label>E-Mail<input name="email" type="email" required></label>
    <label>Passwort<input name="password" type="password" minlength="6" required></label>
    <label>Familientag-Code (optional)<input name="familyCode" placeholder="Familientag-2026-…"></label>
    <p class="hint">Mit dem Code bist du sofort freigeschaltet – ohne Code muss ein Administrator dich bestätigen.</p>
    <button>Registrieren</button>
  </form><p>Schon registriert? <button class="link-button" id="loginBack">Anmelden</button></p>`));
  $("#registerForm").onsubmit=async e=>{
    e.preventDefault(); const x=Object.fromEntries(new FormData(e.currentTarget));
    try{await signUp(x);await init();}catch(err){alert(err.message);}
  };
  $("#loginBack").onclick=showLogin;
}

function showGuest(){
  page(authShell(`<h3>Familientag: Ohne Konto ansehen</h3>
    <form id="guestForm"><label>Code<input name="code" placeholder="Familientag-2026-…" required></label><button>Ansehen</button></form>
    <button class="link-button" id="back">Zurück</button>`));
  $("#guestForm").onsubmit=async e=>{
    e.preventDefault();
    try{await enterGuestMode(new FormData(e.currentTarget).get("code"));await enterFamily();}
    catch(err){alert(err.message);}
  };
  $("#back").onclick=showLogin;
}

function showPending(){
  page(authShell(`<h2>Warte auf Freigabe</h2>
    <p>Dein Konto wurde erstellt. Ein Administrator muss deinen Zugang erst bestätigen.</p>
    <label>Familientag-Code? Dann sofort freischalten<input id="pendingCode" placeholder="Familientag-2026-…"></label>
    <div class="row"><button id="redeem">Code einlösen</button><button id="check">Status prüfen</button><button id="guest">Inzwischen im Familientag-Modus ansehen</button><button id="logout">Abmelden</button></div>`));
  $("#redeem").onclick=async()=>{await redeemFamilyCode($("#pendingCode").value);location.reload();};
  $("#check").onclick=()=>location.reload();
  $("#guest").onclick=showGuest;
  $("#logout").onclick=async()=>{await signOut();showLogin();};
}

async function enterFamily(){
  const family=await loadFamily();
  setState(family);

  if(!state.treeRootId){
    const root=roots(state.people,state.relations)[0]?.id||state.people[0]?.id;
    setState({treeRootId:root,selectedId:state.meId||root});
  }

  if(!state.usageTracked){trackUsage("family_view");setState({usageTracked:true});}

  if(state.access!=="guest" && !state.meId) return showWhoAmI(true);
  showShell("tree");
}

function shell(){
  return `<div class="app-shell">
  <header class="app-header">
    <button class="brand" data-home title="Zur Startansicht"><span class="crest small crest-full"><img src="./assets/wappen-gossler.png" alt="Wappen"></span><span class="brand-text"><b>${CONFIG.family.title}</b><small>${CONFIG.family.subtitle}</small></span></button>
    <nav>
      <button data-view="tree">Stammbaum</button>
      <button data-view="me">Mein Profil</button>
      <button data-view="qr">Mein QR-Code</button>
      <button data-view="scan">QR scannen</button>
      <button data-view="who">Wer bin ich?</button>
      ${state.access==="admin"?`<button data-view="admin">Nutzer-Verwaltung</button>`:""}
      <button data-view="privacy">Datenschutz</button>
      <button data-view="logout">Abmelden</button>
    </nav>
  </header>
  <section class="app-toolbar">
    <input id="globalSearch" placeholder="Name suchen...">
    <button id="legendButton">Zeichenerklärung</button>
  </section>
  <main id="view"></main>
  <aside id="legend" class="legend-panel hidden">
    <button id="closeLegend">×</button><h3>Zeichenerklärung</h3>
    <p><span class="swatch male"></span>Mann <span class="swatch female"></span>Frau</p>
    <p>∞ Partner/in · ⚮ ehemalige/r Partner/in</p>
    <p class="muted-demo">Verstorben (blass)</p>
    <p><b>fett</b> Registriertes Mitglied</p>
    <p><span class="path-demo"></span>Du oder Verwandtschaftspfad</p>
    <p>− Nachkommen ein-/ausklappen · Minimap oben rechts zum Springen</p>
  </aside>
  </div>`;
}

function showShell(view){
  page(shell());
  bindShell();
  renderView(view);
}

function bindShell(){
  document.querySelector("[data-home]")?.addEventListener("click",()=>renderView("tree"));
  document.querySelectorAll("[data-view]").forEach(b=>b.onclick=async()=>{
    const v=b.dataset.view;
    if(v==="logout"){await signOut();return showLogin();}
    if(v==="privacy")return showPrivacy(true);
    if(v==="me"){if(state.meId)openProfile(state.meId,{full:true});return;}
    if(v==="qr"){showQrModal();return;}
    if(v==="scan"){return showScanner();}
    if(v==="who"){return showWhoAmI(false);}
    renderView(v);
  });
  $("#legendButton").onclick=()=>$("#legend").classList.remove("hidden");
  $("#closeLegend").onclick=()=>$("#legend").classList.add("hidden");
  $("#globalSearch").oninput=e=>searchPeople(e.target.value);
}

function renderView(view){
  const outlet=$("#view");
  state.view=view;
  document.querySelectorAll("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  outlet.className=`view view-${view}`;
  if(view==="tree")return Views.mountViews(outlet,state.people,state.relations,{meId:state.meId,onPerson:id=>openProfile(id),canEdit:["member","admin"].includes(state.access)});
  if(view==="admin")return renderAdmin(outlet);
}

function searchPeople(q){
  q=q.trim().toLowerCase();
  let box=document.querySelector("#searchResults");
  if(!box){box=document.createElement("div");box.id="searchResults";box.className="search-results";document.body.appendChild(box);}
  if(!q){box.remove();return;}
  const hits=state.people.filter(p=>familyName(p).toLowerCase().includes(q)).slice(0,12);
  box.innerHTML=hits.map(p=>`<button data-id="${p.id}">${familyName(p)}</button>`).join("");
  box.querySelectorAll("[data-id]").forEach(b=>b.onclick=()=>{openProfile(b.dataset.id);box.remove();});
}

function showWhoAmI(firstTime){
  const modal=document.createElement("div");modal.className="modal";
  modal.innerHTML=`<div class="modal-card"><h2>${firstTime?"Willkommen in der Familie!":"Wer bist du?"}</h2>
    <p>Wähle dich selbst im Stammbaum aus – dann siehst du sofort, wie du mit allen anderen verwandt bist.</p>
    <input id="whoSearch" placeholder="Vor- oder Nachname eingeben...">
    <div id="whoResults"></div>
    ${state.access!=="guest"?`<hr><button id="newProfile">Neues Profil erstellen</button>`:""}
    <button id="viewOnly">Nur ansehen (ohne Auswahl)</button>
  </div>`;
  document.body.appendChild(modal);
  const input=modal.querySelector("#whoSearch"),results=modal.querySelector("#whoResults");
  const paint=()=>{
    const q=input.value.trim().toLowerCase();
    if(!q){
      // Namen erscheinen erst beim Tippen (wie in der Referenz), nicht als Vollliste.
      results.innerHTML=`<p class="who-hint">Tippe einen Namen, um dich zu finden.</p>`;
      return;
    }
    const matches=state.people.filter(p=>familyName(p).toLowerCase().includes(q)).slice(0,15);
    results.innerHTML=matches.length
      ? matches.map(p=>`<button data-id="${p.id}">${familyName(p)}</button>`).join("")
      : `<p class="who-hint">Kein Treffer für „${input.value.trim()}“.</p>`;
    results.querySelectorAll("[data-id]").forEach(b=>b.onclick=async()=>{
      if(state.access!=="guest")await setProfilePerson(b.dataset.id);
      setState({meId:b.dataset.id});modal.remove();showShell("tree");
    });
  };
  input.oninput=paint;paint();
  modal.querySelector("#viewOnly").onclick=()=>{modal.remove();showShell("tree");};
  modal.querySelector("#newProfile")?.addEventListener("click",()=>showNewProfile(modal));
}

function showNewProfile(parentModal){
  parentModal.remove();
  const modal=document.createElement("div");modal.className="modal";
  modal.innerHTML=`<form class="modal-card"><h2>Neues Profil erstellen</h2>
    <label>Vorname<input name="first_name" required></label><label>Nachname<input name="last_name" required></label>
    <label>Geburtsname<input name="birth_name"></label>
    <label>Geschlecht<select name="gender"><option value="m">Mann</option><option value="f">Frau</option><option value="u">Divers/offen</option></select></label>
    <label>Familienzweig<select name="branch">${
      [...new Set(state.people.map(p=>p.last_name).filter(Boolean))]
        .sort((a,b)=>a.localeCompare(b,"de"))
        .map(n=>`<option>${n}</option>`).join("")
    }<option>Sonstige</option></select></label>
    <button>Erstellen</button></form>`;
  document.body.appendChild(modal);
  modal.querySelector("form").onsubmit=async e=>{
    e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));
    await createMyPerson(data);location.reload();
  };
}

function showScanner(){
  const modal=document.createElement("div");modal.className="modal";
  modal.innerHTML=`<div class="modal-card"><h2>QR-Code scannen</h2><p>Halte die Kamera auf den QR-Code eines Familienmitglieds.</p><video id="scannerVideo" playsinline></video><button id="cancelScan">Abbrechen</button></div>`;
  document.body.appendChild(modal);
  let stop=null;
  $("#cancelScan",modal).onclick=()=>{stop?.();modal.remove();};
  startQrScanner($("#scannerVideo",modal),raw=>{
    const m=raw.match(/#connect=([^&]+)/);modal.remove();
    if(m)openProfile(decodeURIComponent(m[1]));
  }).then(x=>stop=x).catch(err=>{alert(err.message);modal.remove();});
}

function showPrivacy(inApp=false){
  const html=`<section class="privacy"><h1>Datenschutz</h1>
    <p>Der Digitale Stammbaum ist ein privates Familienprojekt der Familie Gossler. Ohne Zugang sieht niemand Personendaten; die Seite soll nicht von Suchmaschinen erfasst werden.</p>
    <h3>Wer sieht was</h3>
    <ul><li>Ohne Zugang: nur Anmeldeseite.</li><li>Familientag-Modus: Namen, Lebensdaten, Verwandtschaft, Wohnort, Beruf, Fotos und Vita — keine Kontaktdaten. Nur lesen.</li><li>Freigegebene Mitglieder: zusätzlich Kontaktdaten; sie dürfen Platzhalter und Verbindungen ergänzen.</li><li>Administratoren: zusätzlich Konten und Freigaben.</li></ul>
    <h3>Welche Daten</h3><p>Familienstammdaten aus den bereitgestellten Gossler-Unterlagen sowie Ergänzungen der Familienmitglieder. Kontodaten liegen bei Supabase.</p>
    <h3>Deine Rechte</h3><p>Eigene Angaben können geändert oder reduziert werden. Fotos anderer nur mit deren Einverständnis hochladen.</p>
    <p>Verantwortlich: ${CONFIG.family.contactEmail}</p></section>`;
  if(inApp){$("#view").innerHTML=html;return;}
  page(authShell(html+`<button id="privacyBack">Zurück</button>`));$("#privacyBack").onclick=showLogin;
}


document.addEventListener("gossler:show-in-tree",e=>{const id=e.detail?.personId;if(!id)return;setState({selectedId:id});showShell("tree");setTimeout(()=>Views.showInTree(id,{view:"tree"}),80);});
document.addEventListener("gossler:highlight-connection",e=>{const {meId,otherId}=e.detail||{};if(!meId||!otherId)return;setState({selectedId:otherId});if(state.view!=="tree")showShell("tree");setTimeout(()=>Views.highlightConnection(meId,otherId),80);});
document.addEventListener("gossler:open-full-profile",e=>{const id=e.detail?.personId;if(!id)return;location.hash=`person=${encodeURIComponent(id)}`;openProfile(id,{full:true});});
document.addEventListener("gossler:ring-action",async e=>{const {action,targetId}=e.detail||{};if(!targetId)return;if(action==="relationship"){if(state.meId&&state.meId!==targetId){setState({selectedId:targetId});return document.dispatchEvent(new CustomEvent("gossler:highlight-connection",{detail:{meId:state.meId,otherId:targetId}}));}setState({selectedId:targetId});return openProfile(targetId);}if(!["member","admin"].includes(state.access))return alert("Zum Bearbeiten ist ein freigegebenes Familienkonto erforderlich.");setState({selectedId:targetId});openProfile(targetId);});

if(location.hash==="#reset-password"){
  page(authShell(`<h2>Neues Passwort</h2><form id="resetForm"><label>Neues Passwort<input name="password" type="password" minlength="6" required></label><label>Passwort bestätigen<input name="confirm" type="password" minlength="6" required></label><button>Passwort ändern</button></form>`));
  $("#resetForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);if(f.get("password")!==f.get("confirm"))return alert("Passwörter stimmen nicht überein.");await updatePassword(f.get("password"));location.hash="";await init();};
}else{
  init();
}
