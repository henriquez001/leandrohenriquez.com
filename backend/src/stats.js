// Statistiche: il server chiede i dati a GoatCounter con la chiave segreta, il browser non la vede mai.
import {Errore} from './github.js';
export async function statistiche(env,giorni,f=fetch,ora=new Date()){
  if(!env.GOATCOUNTER_CODE||!env.GOATCOUNTER_TOKEN)throw new Errore(503,'GoatCounter non è ancora collegato');
  giorni=Math.min(365,Math.max(1,parseInt(giorni)||30));
  const fine=new Date(ora),inizio=new Date(ora.getTime()-giorni*864e5);
  const q=`start=${inizio.toISOString().slice(0,10)}&end=${fine.toISOString().slice(0,10)}`;
  const base=`https://${env.GOATCOUNTER_CODE}.goatcounter.com/api/v0`;
  const get=async p=>{const r=await f(`${base}/${p}`,{headers:{authorization:`Bearer ${env.GOATCOUNTER_TOKEN}`,'content-type':'application/json'}});
    if(!r.ok)throw new Errore(502,`GoatCounter ha risposto ${r.status}`);return r.json();};
  const [totale,pagine,fonti,dispositivi]=await Promise.all([get(`stats/total?${q}`),get(`stats/hits?${q}&limit=20`),get(`stats/toprefs?${q}&limit=10`),get(`stats/sizes?${q}`)]);
  // eventi del sito (es. "apri-oopar", "email-copiata") arrivano come percorsi con event:true
  const righe=(pagine.hits||[]).map(h=>({percorso:h.path,titolo:h.title||'',evento:!!h.event,visite:h.count,giorni:(h.stats||[]).map(s=>({giorno:s.day,visite:s.daily}))}));
  return {
    periodo:{da:inizio.toISOString().slice(0,10),a:fine.toISOString().slice(0,10),giorni},
    totale:totale.total??0,unici:totale.total_unique??totale.total??0,
    perGiorno:(totale.stats||[]).map(s=>({giorno:s.day,visite:s.daily})),
    pagine:righe.filter(r=>!r.evento),eventi:righe.filter(r=>r.evento),
    provenienza:(fonti.stats||[]).map(s=>({nome:s.name||'diretto',visite:s.count})),
    dispositivi:(dispositivi.stats||[]).map(s=>({nome:s.name,visite:s.count}))
  };
}
