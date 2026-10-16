(() => {
  const api = "https://api.aladhan.com/v1";
  const eventsNode = document.getElementById("calendar-events");
  const statusNode = document.getElementById("calendar-status");
  const locationNote = document.getElementById("calendar-location-note");
  const known = {
    "1-1":["Islamic New Year","The first day of Muharram marks the beginning of the Hijri year.","☾"],
    "1-10":["Day of Ashura","The tenth of Muharram; observances and practices vary among Muslim communities.","✧"],
    "3-12":["Mawlid an-Nabi (observance varies)","Some communities commemorate the birth of Prophet Muhammad ﷺ on this date.","۞"],
    "7-27":["Isra and Mi'raj (commonly observed)","A night remembered for the Prophet's journey; observance varies by community.","✦"],
    "8-15":["Mid-Sha'ban (observance varies)","A date observed by some communities before Ramadan.","☾"],
    "9-1":["First day of Ramadan","The beginning of the month of fasting, subject to local moon sighting.","🌙"],
    "9-17":["Nuzul al-Quran (commonly observed)","A date commonly used in some countries to remember the revelation of the Quran.","۞"],
    "10-1":["Eid al-Fitr","The celebration marking the end of Ramadan. Confirm the date with local authorities.","✧"],
    "12-9":["Day of Arafah","A significant day during Hajj; the date follows the local Hijri calendar.","☾"],
    "12-10":["Eid al-Adha","The Festival of Sacrifice during the days of Hajj. Confirm local announcements.","✦"],
    "12-11":["Days of Tashreeq begin","The 11th–13th of Dhul Hijjah are known as the Days of Tashreeq.","۞"]
  };
  const monthNames = ["Muharram","Safar","Rabi al-Awwal","Rabi al-Thani","Jumada al-Ula","Jumada al-Akhirah","Rajab","Sha'ban","Ramadan","Shawwal","Dhul Qi'dah","Dhul Hijjah"];
  const dateLabel = iso => new Intl.DateTimeFormat("en",{weekday:"short",day:"numeric",month:"short",year:"numeric"}).format(new Date(iso+"T12:00:00"));
  function localCoords(){try{const x=JSON.parse(localStorage.getItem("noor.savedLocation")||"null");if(x&&Number.isFinite(x.lat)&&Number.isFinite(x.lon))return x;}catch(_){}return {lat:-6.2088,lon:106.8456,default:true};}
  function buildCard(event){const card=document.createElement("article");card.className="calendar-event noor-reveal";const icon=document.createElement("span");icon.className="calendar-event-symbol";icon.textContent=event.symbol;const body=document.createElement("div");const title=document.createElement("h3");title.textContent=event.title;const date=document.createElement("strong");date.className="calendar-event-date";date.textContent=dateLabel(event.date);const hijri=document.createElement("small");hijri.className="calendar-hijri-date";hijri.textContent=event.hijri;const description=document.createElement("p");description.textContent=event.description;body.append(title,date,hijri,description);card.append(icon,body);return card;}
  async function loadCalendar(){eventsNode.replaceChildren();statusNode.textContent="Checking the Hijri calendar for the next year…";const loc=localCoords();locationNote.textContent=loc.default?"Showing estimates using Jakarta as a starting point. Set your location in Prayer Times for a more local calendar.":"Using your saved device location. Dates are still estimates until confirmed locally.";const today=new Date();const requests=[];
    for(let offset=0;offset<12;offset++){const monthDate=new Date(today.getFullYear(),today.getMonth()+offset,1);requests.push({year:monthDate.getFullYear(),month:monthDate.getMonth()+1});}
    try{const results=await Promise.all(requests.map(async m=>{const url=new URL(api+"/calendar/"+m.year+"/"+m.month);url.searchParams.set("latitude",String(loc.lat));url.searchParams.set("longitude",String(loc.lon));url.searchParams.set("method","20");const res=await fetch(url);if(!res.ok)throw new Error("Calendar service is temporarily unavailable.");const json=await res.json();if(json.code!==200||!Array.isArray(json.data))throw new Error("The Hijri calendar could not be loaded.");return json.data;}));
      const allDays=results.flat();const found=[];const seen=new Set();
      allDays.forEach(day=>{const h=day.date&&day.date.hijri;if(!h)return;const key=Number(h.month.number)+"-"+Number(h.day);const match=known[key];if(!match)return;const iso=day.date.gregorian.date.split("-").reverse().join("-");if(iso<today.toISOString().slice(0,10))return;const unique=key+"-"+iso;if(seen.has(unique))return;seen.add(unique);found.push({date:iso,title:match[0],description:match[1],symbol:match[2],hijri:(h.day+" "+(h.month.en||monthNames[Number(h.month.number)-1])+" "+h.year+" AH")});});
      found.sort((a,b)=>a.date.localeCompare(b.date));if(!found.length){statusNode.textContent="No upcoming dates were returned. Please refresh in a moment.";return;}found.forEach(item=>eventsNode.appendChild(buildCard(item)));statusNode.textContent="Showing "+found.length+" upcoming occasions across the next 12 months. Dates are estimates and may shift with local moon sighting.";
    }catch(error){statusNode.textContent=error.message||"Could not load Islamic dates. Please try again.";statusNode.classList.add("is-error");}}
  document.getElementById("calendar-refresh").addEventListener("click",loadCalendar);loadCalendar();
})();