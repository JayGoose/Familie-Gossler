
import { state } from "./state.js";

export function profileQrUrl(personId) {
  const base = location.origin + location.pathname;
  return `${base}#connect=${encodeURIComponent(personId)}`;
}

export function showQrModal(personId = state.meId) {
  const modal=document.createElement("div");
  modal.className="modal";
  modal.innerHTML=`<div class="modal-card qr-card">
    <h2>Mein QR-Code</h2>
    <p>Andere scannen diesen Code, um eure Verbindung zu sehen.</p>
    <div id="qrCanvas"></div>
    <button data-close>Schließen</button>
  </div>`;
  document.body.appendChild(modal);
  modal.querySelector("[data-close]").onclick=()=>modal.remove();

  const url=profileQrUrl(personId);
  if(window.QRCode){
    new window.QRCode(modal.querySelector("#qrCanvas"), { text:url, width:220, height:220 });
  } else {
    modal.querySelector("#qrCanvas").textContent=url;
  }
}

export async function startQrScanner(video, onResult) {
  if(!("BarcodeDetector" in window)){
    throw new Error("QR-Scanner wird von diesem Browser nicht unterstützt.");
  }
  const detector=new BarcodeDetector({formats:["qr_code"]});
  const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
  video.srcObject=stream; await video.play();

  let stopped=false;
  const stop=()=>{stopped=true;stream.getTracks().forEach(t=>t.stop());};
  const scan=async()=>{
    if(stopped)return;
    try{
      const codes=await detector.detect(video);
      if(codes[0]?.rawValue){stop();onResult(codes[0].rawValue);return;}
    }catch(_){}
    requestAnimationFrame(scan);
  };
  scan(); return stop;
}
