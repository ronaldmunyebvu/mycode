import{s as n}from"./supabase-DbdlIviU.js";let s=[];async function p(){const{data:{session:e}}=await n.auth.getSession();if(!e){window.location.href="index.html";return}a()}async function a(){const e=document.getElementById("hookups-grid");e.innerHTML="<p>Loading...</p>";const{data:t,error:i}=await n.from("hookups").select("*").order("created_at",{ascending:!1});if(i){e.innerHTML=`<p style="color:red;">Error loading: ${i.message}</p>`;return}if(s=t,t.length===0){e.innerHTML='<p style="color:#ccc;">No hookups found.</p>';return}e.innerHTML="",t.forEach(o=>{const r=document.createElement("div");r.className="glass-card",r.style.cssText="padding:1.5rem;display:flex;flex-direction:column;gap:1rem;";const l=o.pictures.map(c=>`<img src="${c}" style="width:100%;height:100px;object-fit:cover;border-radius:8px;"/>`).join("");r.innerHTML=`
          <div>
            <h3 style="color:var(--accent-light);margin-bottom:0.3rem;">${o.name}</h3>
            <p style="font-size:0.9rem;color:var(--text-primary);">📍 ${o.location}</p>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.5rem;">${l}</div>
          <p style="font-size:0.9rem;margin-top:0.5rem;color:var(--text-primary);">📞 <strong>${o.phone}</strong></p>
          <p style="font-size:0.9rem;color:var(--text-muted);">${o.description}</p>
          <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:auto;">
            <button class="btn btn-outline" style="flex:1;padding:0.7rem;font-size:0.9rem;border-color:#ef4444;color:#ef4444;" onclick="deleteHookup('${o.id}')">Delete</button>
          </div>
        `,e.appendChild(r)})}window.deleteHookup=async function(e){if(!confirm("Delete this hookup? This cannot be undone."))return;const t=s.find(o=>o.id===e);if(t){const o=t.pictures.map(r=>r.split("/").pop());await n.storage.from("hookups").remove(o)}const{error:i}=await n.from("hookups").delete().eq("id",e);i?alert("Error deleting: "+i.message):a()};p();
