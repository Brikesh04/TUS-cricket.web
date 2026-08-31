javascript:(async function(){
  try {
    const S_URL="__SUPABASE_URL__";
    const S_KEY="__SUPABASE_ANON_KEY__";
    const headers={"apikey":S_KEY,"Authorization":"Bearer "+S_KEY,"Content-Type":"application/json"};
    const url=window.location.href;
    
    let type="";
    const lowerUrl = url.toLowerCase();
    if(lowerUrl.includes("teambatting") || lowerUrl.includes("battingstats") || lowerUrl.includes("batting")) type="Batting";
    else if(lowerUrl.includes("teambowling") || lowerUrl.includes("bowlingstats") || lowerUrl.includes("bowling")) type="Bowling";
    else if(lowerUrl.includes("teamfielding") || lowerUrl.includes("fieldingstats") || lowerUrl.includes("fielding")) type="Fielding";
    else {
      alert("❌ Not a recognized CricClubs stats page!\nMake sure the URL contains 'batting', 'bowling', or 'fielding'.");
      return;
    }

    const format=prompt("Enter Format ('T20' or 'Fifty'):","T20");
    if(!format) return;
    const season=prompt("Enter Season Year:",new Date().getFullYear().toString());
    if(!season) return;

    alert(`⏳ Syncing ${season} ${format} ${type} stats... Please wait.`);

    let table;
    const tables=document.querySelectorAll("table");
    let maxScore = -1;
    for(let t of tables){
      const ths = Array.from(t.querySelectorAll("th")).map(x => x.innerText.toUpperCase());
      if(ths.length > 4) {
        let score = 0;
        if(ths.some(h => h.includes("PLAYER") || h === "NAME" || h.includes("BATSMAN") || h.includes("BATTER") || h.includes("BOWLER") || h.includes("FIELDER"))) score += 10;
        if(ths.some(h => h === "M" || h.includes("MAT") || h.includes("MATCHES"))) score += 5;
        if(ths.some(h => h === "R" || h.includes("RUNS") || h === "W" || h.includes("WKTS") || h.includes("CATCH"))) score += 5;
        
        if (score > maxScore) {
          maxScore = score;
          table = t;
        }
      }
    }

    if(!table){
      alert("❌ Could not find the main stats table on this page.");
      return;
    }

    const allRows=Array.from(table.querySelectorAll("tr"));
    let headerRowIdx=-1;
    for(let i=0;i<allRows.length;i++){
      const text = allRows[i].innerText.toUpperCase();
      if(Array.from(allRows[i].children).length>4 && (
        text.includes("PLAYER") || 
        text.includes("NAME") || 
        text.includes("BATSMAN") || 
        text.includes("BATTER") || 
        text.includes("BOWLER") || 
        text.includes("FIELDER")
      )){
        headerRowIdx=i;
        break;
      }
    }

    if(headerRowIdx===-1) headerRowIdx=0;
    const headerRow=allRows[headerRowIdx];
    const ths=Array.from(headerRow.children).map(th=>th.innerText.trim().toUpperCase());
    
    let nameIdx=ths.findIndex(h=>h.includes("PLAYER")||h==="NAME"||h.includes("BATSMAN")||h.includes("BATTER")||h.includes("BOWLER")||h.includes("FIELDER"));
    if(nameIdx===-1) nameIdx=1;

    const statsMap=[];
    for(let i=headerRowIdx+1;i<allRows.length;i++){
      const tds=Array.from(allRows[i].children);
      if(tds.length<4) continue;
      
      let playerNameText=tds[nameIdx]?tds[nameIdx].textContent.trim():"";
      let playerName=playerNameText.replace(/\(c\)|\(wk\)|\*|\†/gi,'').replace(/\s+/g, ' ').trim();
      if(!playerName||playerName.includes("Extras")||playerName.includes("Total")||playerName.includes("Did not bat")) continue;
      
      let value=0,matches=0;
      let ballsFaced=0, battingAvg=0, strikeRate=0;
      let overs=0, runsConceded=0, economy=0, bowlingAvg=0;
      const mIdx=ths.findIndex(h=>h==="M"||h.includes("MAT")||h.includes("MATCHES"));
      if(mIdx>=0) matches=parseInt(tds[mIdx]?.textContent||"0",10)||0;
      
      if(type==="Batting"){
        const runsIdx=ths.findIndex(h=>h==="R"||h.includes("RUNS"));
        if(runsIdx>=0) value=parseInt(tds[runsIdx]?.textContent||"0",10);

        const bfIdx=ths.findIndex(h=>h==="BF"||h.includes("BALLS"));
        if(bfIdx>=0) ballsFaced=parseInt(tds[bfIdx]?.textContent||"0",10)||0;

        const avgIdx=ths.findIndex(h=>h==="AVG"||h.includes("AVERAGE"));
        if(avgIdx>=0) battingAvg=parseFloat(tds[avgIdx]?.textContent||"0.0")||0;

        const srIdx=ths.findIndex(h=>h==="SR"||h.includes("STRIKE"));
        if(srIdx>=0) strikeRate=parseFloat(tds[srIdx]?.textContent||"0.0")||0;
      } else if(type==="Bowling"){
        const wktsIdx=ths.findIndex(h=>h==="W"||h.includes("WKTS")||h.includes("WICKETS"));
        if(wktsIdx>=0) value=parseInt(tds[wktsIdx]?.textContent||"0",10);

        const oversIdx=ths.findIndex(h=>h==="OVERS"||h==="O"||h.includes("OVERS"));
        if(oversIdx>=0) overs=parseFloat(tds[oversIdx]?.textContent||"0.0")||0;

        const runsConcededIdx=ths.findIndex(h=>h==="RUNS"||h==="R"||h.includes("RUNS")||h.includes("CONCEDED"));
        if(runsConcededIdx>=0) runsConceded=parseInt(tds[runsConcededIdx]?.textContent||"0",10)||0;

        const econIdx=ths.findIndex(h=>h==="ECON"||h==="E"||h.includes("ECONOMY"));
        if(econIdx>=0) economy=parseFloat(tds[econIdx]?.textContent||"0.0")||0;

        const bowlingAvgIdx=ths.findIndex(h=>h==="AVG"||h.includes("AVERAGE"));
        if(bowlingAvgIdx>=0) bowlingAvg=parseFloat(tds[bowlingAvgIdx]?.textContent||"0.0")||0;
      } else if(type==="Fielding"){
        let outfieldCatches = 0;
        let wkCatches = 0;
        let stumpings = 0;
        let runOuts = 0;

        ths.forEach((header, idx) => {
          const val = parseInt(tds[idx]?.textContent || "0", 10) || 0;
          if (header.includes("WK") && (header.includes("CATCH") || header.includes("CT") || header.includes("C"))) {
            wkCatches += val;
          } 
          else if ((header.includes("CATCH") || header === "C" || header === "CT") && !header.includes("WK")) {
            outfieldCatches += val;
          } 
          else if (header.includes("STUMP") || header === "ST" || header === "S") {
            stumpings += val;
          } 
          else if (header.includes("RO") || header.includes("RUNOUT") || header.includes("RUN OUT") || header.includes("DIRECT") || header.includes("INDIRECT")) {
            runOuts += val;
          }
        });

        value = outfieldCatches + wkCatches + stumpings + runOuts;
      }
      
      if(isNaN(value)) value=0;
      statsMap.push({
        name:playerName,
        value,
        matches,
        ballsFaced,
        battingAvg,
        strikeRate,
        overs,
        runsConceded,
        economy,
        bowlingAvg
      });
    }

    if(statsMap.length===0){
      alert("❌ No players found in the table.");
      return;
    }

    const mapRes=await fetch(`${S_URL}/rest/v1/mappings?select=*`,{headers});
    if(!mapRes.ok) throw new Error("Failed to fetch name mappings.");
    const mappings=await mapRes.json();

    const getMappedName=(name)=>{
      const m=mappings.find(x=>x.source_name.toLowerCase()===name.toLowerCase());
      return m?m.target_name:name;
    };

    const exRes=await fetch(`${S_URL}/rest/v1/player_stats?season=eq.${season}&format=eq.${format}`,{headers});
    if(!exRes.ok) throw new Error("Failed to fetch existing stats.");
    const existingStats=await exRes.json();

    const payloads=statsMap.map(stat=>{
      const targetName=getMappedName(stat.name);
      let existing=existingStats.find(s=>s.player_name===targetName);
      let record={...existing};
      
      if(!existing){
        record={
          player_name:targetName,
          season:parseInt(season),
          format:format,
          runs:0,
          wickets:0,
          catches:0,
          matches:0,
          overs:0,
          runs_conceded:0,
          balls_faced:0,
          strike_rate:0,
          economy:0,
          batting_avg:0,
          bowling_avg:0
        };
      }
      
      record.updated_at = new Date().toISOString();

      if(type==="Batting"){
        record.runs=stat.value;
        record.balls_faced=stat.ballsFaced;
        record.batting_avg=stat.battingAvg;
        record.strike_rate=stat.strikeRate;
        record.matches=Math.max(record.matches||0,stat.matches);
      }
      if(type==="Bowling"){
        record.wickets=stat.value;
        record.overs=stat.overs;
        record.runs_conceded=stat.runsConceded;
        record.economy=stat.economy;
        record.bowling_avg=stat.bowlingAvg;
        record.matches=Math.max(record.matches||0,stat.matches);
      }
      if(type==="Fielding"){
        record.catches=stat.value;
        record.matches=Math.max(record.matches||0,stat.matches);
      }
      
      return record;
    });

    existingStats.forEach(existing=>{
      const isFound=statsMap.some(stat=>getMappedName(stat.name)===existing.player_name);
      if(!isFound){
        let ghostUpdate={...existing};
        let changed=false;
        if(type==="Batting"&&ghostUpdate.runs!==0){
          ghostUpdate.runs=0;
          ghostUpdate.balls_faced=0;
          ghostUpdate.batting_avg=0;
          ghostUpdate.strike_rate=0;
          changed=true;
        }
        if(type==="Bowling"&&ghostUpdate.wickets!==0){
          ghostUpdate.wickets=0;
          ghostUpdate.overs=0;
          ghostUpdate.runs_conceded=0;
          ghostUpdate.economy=0;
          ghostUpdate.bowling_avg=0;
          changed=true;
        }
        if(type==="Fielding"&&ghostUpdate.catches!==0){
          ghostUpdate.catches=0;
          changed=true;
        }
        if(changed){
          ghostUpdate.updated_at = new Date().toISOString();
          payloads.push(ghostUpdate);
        }
      }
    });

    const inserts=payloads.filter(p=>!p.id);
    const updates=payloads.filter(p=>p.id);
    let errorMsg=null;

    if(inserts.length>0){
      const res=await fetch(`${S_URL}/rest/v1/player_stats`,{
        method:"POST",
        headers,
        body:JSON.stringify(inserts)
      });
      if(!res.ok) errorMsg=await res.text();
    }

    for(const up of updates){
      const id=up.id;
      const payload={...up};
      delete payload.id;
      const res=await fetch(`${S_URL}/rest/v1/player_stats?id=eq.${id}`,{
        method:"PATCH",
        headers,
        body:JSON.stringify(payload)
      });
      if(!res.ok&&!errorMsg) errorMsg=await res.text();
    }

    if(errorMsg){
      alert("⚠️ Finished with errors: "+errorMsg);
    } else {
      alert(`✅ Successfully synced ${payloads.length} players for ${season} (${type} - ${format})!\n\nCheck your website!`);
    }
  } catch(err) {
    alert("❌ Unexpected Error: "+err.message);
  }
})();
