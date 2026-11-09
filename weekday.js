/* Weekday range checker add-on (load after weekly.js) */
(function(){
var K='sbWeekday_v1',D=['Mon','Tue','Wed','Thu','Fri'];
var a=document.getElementById('wkPicks');a=a&&a.closest('.card');
var html='<div class="card"><div class="cardTitle">Weekday ranges (last ~12 weeks, 4H data)</div><div class="fxTopRow"><button class="refreshBtn mono" id="wdBtn">Run weekday scan</button><span class="fxStatus mono" id="wdStatus">Not run yet. Takes about 3 min.</span></div><div id="wdOut"></div><div class="fxNote">Range = daily high minus low, as a multiple of each pair\'s own average day (1.00 = average). "Biggest" = share of full weeks where that weekday had the largest range.</div></div>';
if(a)a.insertAdjacentHTML('afterend',html);else document.getElementById('fxTab').insertAdjacentHTML('afterbegin',html);
document.getElementById('wdBtn').addEventListener('click',scan);
function sleep(ms){return new Promise(function(r){setTimeout(r,ms)})}
function mon(d,wd){var t=new Date(d+'T00:00:00Z');t.setUTCDate(t.getUTCDate()-(wd-1));return t.toISOString().slice(0,10)}
async function get(pair){
  var url='https://api.twelvedata.com/time_series?symbol='+pair.slice(0,3)+'/'+pair.slice(3)+'&interval=4h&outputsize=360&apikey='+TWELVEDATA_API_KEY;
  var j=await (await fetch(url)).json();
  if(j.status==='error')throw new Error(j.message);
  var days={};
  j.values.forEach(function(v){var d=v.datetime.slice(0,10);var o=days[d]||(days[d]={h:-1e9,l:1e9,n:0,c:+v.close});o.h=Math.max(o.h,+v.high);o.l=Math.min(o.l,+v.low);o.n++});
  var out=[];
  Object.keys(days).forEach(function(d){var wd=new Date(d+'T00:00:00Z').getUTCDay(),o=days[d];if(wd<1||wd>5||o.n<5)return;out.push({d:d,wd:wd,r:(o.h-o.l)/o.c*100})});
  return out;
}
async function scan(){
  var btn=document.getElementById('wdBtn'),st=document.getElementById('wdStatus');
  if(!TWELVEDATA_API_KEY){st.textContent='No TwelveData key set.';return}
  var pairs=WATCHLIST.filter(function(p){return p.indexOf('XA')!==0});
  btn.disabled=true;var data={};
  for(var i=0;i<pairs.length;i++){
    if(i>0&&i%8===0){for(var s=62;s>0;s--){st.textContent='Rate limit pause: '+s+'s';await sleep(1000)}}
    st.textContent='Fetching '+pairs[i]+' ('+(i+1)+'/'+pairs.length+')';
    var ok=false;
    for(var tries=0;tries<3&&!ok;tries++){
      try{data[pairs[i]]=await get(pairs[i]);ok=true}
      catch(e){
        if(/credits|minute/i.test(e.message)&&tries<2){for(var w=62;w>0;w--){st.textContent='Rate limit, retrying '+pairs[i]+' in '+w+'s';await sleep(1000)}}
        else{st.textContent='Stopped at '+pairs[i]+': '+e.message;btn.disabled=false;return}
      }
    }
  }
  try{localStorage.setItem(K,JSON.stringify({t:Date.now(),data:data}))}catch(e){}
  render(data);st.textContent='Scan complete.';btn.disabled=false;
}
function render(data){
  var ratio={},tot=[0,0,0,0,0],n=[0,0,0,0,0],big=[0,0,0,0,0],weeks=0;
  Object.keys(data).forEach(function(p){
    var rows=data[p],mean=rows.reduce(function(s,x){return s+x.r},0)/rows.length,sum=[0,0,0,0,0],cnt=[0,0,0,0,0],wk={};
    rows.forEach(function(x){var i=x.wd-1;sum[i]+=x.r/mean;cnt[i]++;tot[i]+=x.r/mean;n[i]++;(wk[mon(x.d,x.wd)]=wk[mon(x.d,x.wd)]||{})[i]=x.r});
    ratio[p]=sum.map(function(s,i){return cnt[i]?s/cnt[i]:0});
    Object.keys(wk).forEach(function(k){var w=wk[k];if(Object.keys(w).length<5)return;var b=0;for(var i=1;i<5;i++)if(w[i]>w[b])b=i;big[b]++;weeks++});
  });
  var avg=tot.map(function(t,i){return n[i]?t/n[i]:0}),mx=Math.max.apply(null,avg);
  var h='<table class="wkTbl" style="margin-top:10px"><tr><th>Day</th><th>Avg range</th><th>Biggest</th></tr>'+D.map(function(d,i){return '<tr'+(avg[i]===mx?' class="pk"':'')+'><td>'+d+'</td><td>'+avg[i].toFixed(2)+'x</td><td>'+(weeks?Math.round(100*big[i]/weeks):0)+'%</td></tr>'}).join('')+'</table>';
  h+='<div class="wkSub" style="margin:6px 0 10px">Based on '+weeks+' pair-weeks. Equal chance for each day would be 20%.</div><div class="wkScroll"><table class="wkTbl"><tr><th>Pair</th>'+D.map(function(d){return '<th>'+d+'</th>'}).join('')+'</tr>'+Object.keys(ratio).map(function(p){var r=ratio[p],m=Math.max.apply(null,r);return '<tr><td>'+p+'</td>'+r.map(function(v){return '<td'+(v===m?' class="wkL"':'')+'>'+v.toFixed(2)+'</td>'}).join('')+'</tr>'}).join('')+'</table></div>';
  document.getElementById('wdOut').innerHTML=h;
}
try{var c=JSON.parse(localStorage.getItem(K)||'null');if(c){render(c.data);document.getElementById('wdStatus').textContent='Showing last saved scan.'}}catch(e){}
})();
