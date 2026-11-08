/* Weekly 4H screener add-on for the FX Bias tab */
(function(){
var css=document.createElement('style');
css.textContent='.pairBtn.wkPick{border-color:#d4a24e;color:#d4a24e}.wkRow{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #27272a}.wkL{color:#34d399;font-weight:650}.wkS{color:#fb7185;font-weight:650}.wkSub{font-size:11px;color:#71717a}.wkTbl{width:100%;border-collapse:collapse;font-size:12px;font-family:ui-monospace,monospace}.wkTbl th,.wkTbl td{padding:6px;text-align:right;border-bottom:1px solid #27272a;white-space:nowrap}.wkTbl th:first-child,.wkTbl td:first-child{text-align:left}.wkTbl th{color:#71717a;font-weight:500}.wkTbl tr.pk td:first-child{color:#d4a24e;font-weight:700}.wkScroll{overflow-x:auto}';
document.head.appendChild(css);
var tab=document.getElementById('fxTab');
tab.insertAdjacentHTML('afterbegin','<div class="card"><div class="cardTitle">Weekly picks (4H data, run on weekends)</div><div class="fxTopRow"><button class="refreshBtn mono" id="wkBtn">Run weekly scan</button><span class="fxStatus mono" id="wkStatus">Not run yet. Takes about 3 min.</span></div><div id="wkPicks"></div><div id="wkStrength"></div><div class="wkScroll" id="wkTable"></div><div class="fxNote">Score 0-100: strength spread 40, 1-week agreement 15, trend 20, pullback location 25. Picks never share a currency. Check the news calendar first.</div></div><div class="cardTitle" style="margin:6px 2px 10px">Entry check (intraday)</div>');
document.getElementById('wkBtn').addEventListener('click',scan);

function picksSet(){try{var c=JSON.parse(localStorage.getItem('sbWeeklyScan_v1')||'null');if(c&&c.picks)return new Set(c.picks)}catch(e){}return new Set()}
function sleep(ms){return new Promise(function(r){setTimeout(r,ms)})}
function ema(a,n){var k=2/(n+1),e=a[0];for(var i=0;i<a.length;i++)e=a[i]*k+e*(1-k);return e}
async function get(pair){
  var url='https://api.twelvedata.com/time_series?symbol='+pair.slice(0,3)+'/'+pair.slice(3)+'&interval=4h&outputsize=320&apikey='+TWELVEDATA_API_KEY;
  var j=await (await fetch(url)).json();
  if(j.status==='error')throw new Error(j.message);
  var b=j.values.slice().reverse().map(function(v){return{h:+v.high,l:+v.low,c:+v.close}});
  var c=b.map(function(x){return x.c}),n=c.length-1,tr=0;
  for(var i=n-13;i<=n;i++)tr+=Math.max(b[i].h-b[i].l,Math.abs(b[i].h-c[i-1]),Math.abs(b[i].l-c[i-1]));
  return{r1:(c[n]/c[n-30]-1)*100,r4:(c[n]/c[n-120]-1)*100,p:c[n],e50:ema(c,50),e200:ema(c,200),atr:tr/14};
}
async function scan(){
  var btn=document.getElementById('wkBtn'),st=document.getElementById('wkStatus');
  if(!TWELVEDATA_API_KEY){st.textContent='No TwelveData key set.';return}
  var pairs=WATCHLIST.filter(function(p){return p.indexOf('XA')!==0});
  btn.disabled=true;var data={};
  for(var i=0;i<pairs.length;i++){
    if(i>0&&i%8===0){for(var s=62;s>0;s--){st.textContent='Rate limit pause: '+s+'s';await sleep(1000)}}
    st.textContent='Fetching '+pairs[i]+' ('+(i+1)+'/'+pairs.length+')';
    try{data[pairs[i]]=await get(pairs[i])}catch(e){st.textContent='Stopped at '+pairs[i]+': '+e.message;btn.disabled=false;return}
  }
  var res=render(data,Date.now());
  try{localStorage.setItem('sbWeeklyScan_v1',JSON.stringify({t:Date.now(),data:data,picks:res}))}catch(e){}
  st.textContent='Scan complete.';btn.disabled=false;renderPairRow();
}
function render(data,t){
  var sg=function(x){return x>0?1:-1},s1={},s4={},ct={};
  Object.keys(data).forEach(function(p){
    var b=p.slice(0,3),q=p.slice(3),d=data[p];
    [[b,1],[q,-1]].forEach(function(x){var c=x[0],m=x[1];s1[c]=(s1[c]||0)+m*d.r1;s4[c]=(s4[c]||0)+m*d.r4;ct[c]=(ct[c]||0)+1});
  });
  var cur=Object.keys(ct);cur.forEach(function(c){s1[c]/=ct[c];s4[c]/=ct[c]});
  var rows=Object.keys(data).map(function(p){return{p:p,b:p.slice(0,3),q:p.slice(3),d:data[p]}});
  rows.forEach(function(r){r.sp4=s4[r.b]-s4[r.q];r.sp1=s1[r.b]-s1[r.q]});
  var m4=Math.max.apply(null,rows.map(function(r){return Math.abs(r.sp4)}))||1,m1=Math.max.apply(null,rows.map(function(r){return Math.abs(r.sp1)}))||1;
  rows.forEach(function(r){
    var dir=sg(r.sp4),d=r.d;r.dir=dir;
    var st=40*Math.abs(r.sp4)/m4+(sg(r.sp1)===dir?15*Math.min(1,Math.abs(r.sp1)/m1):0);
    r.tr=(dir*(d.p-d.e50)>0?10:0)+(dir*(d.e50-d.e200)>0?10:0);
    r.x=dir*(d.p-d.e50)/d.atr;
    var lo=0;if(r.x>=0&&r.x<=1.5)lo=25;else if(r.x<0&&r.x>=-0.5)lo=15;else if(r.x>1.5&&r.x<3)lo=25*(3-r.x)/1.5;
    r.score=Math.round(st+r.tr+lo);
  });
  rows.sort(function(a,b){return b.score-a.score});
  var used={},picks=[];
  rows.forEach(function(r){
    if(picks.length>=3||used[r.b]||used[r.q])return;
    used[r.b]=1;used[r.q]=1;picks.push(r);r.pick=1;
  });
  document.getElementById('wkPicks').innerHTML=picks.map(function(r){return '<div class="wkRow"><span><span class="'+(r.dir>0?'wkL':'wkS')+'">'+(r.dir>0?'Long':'Short')+' '+r.p+'</span><br><span class="wkSub">'+r.b+(r.sp4>0?' stronger':' weaker')+' than '+r.q+' · '+r.x.toFixed(1)+' ATR from EMA50</span></span><span class="mono" style="font-weight:700">'+r.score+'</span></div>'}).join('')+'<div class="wkSub" style="margin-top:6px">Data as of '+new Date(t).toLocaleString()+'</div>';
  var order=cur.slice().sort(function(a,b){return s4[b]-s4[a]});
  document.getElementById('wkStrength').innerHTML='<div class="wkSub mono" style="margin-top:10px">'+order.map(function(c){return c+' '+(s4[c]>=0?'+':'')+s4[c].toFixed(2)+'%'}).join(' · ')+'</div>';
  document.getElementById('wkTable').innerHTML='<table class="wkTbl" style="margin-top:10px"><tr><th>Pair</th><th>Dir</th><th>Score</th><th>4W</th><th>1W</th><th>Trend</th><th>ATR</th></tr>'+rows.map(function(r){return '<tr class="'+(r.pick?'pk':'')+'"><td>'+r.p+'</td><td class="'+(r.dir>0?'wkL':'wkS')+'">'+(r.dir>0?'L':'S')+'</td><td>'+r.score+'</td><td>'+r.sp4.toFixed(2)+'</td><td>'+r.sp1.toFixed(2)+'</td><td>'+r.tr+'/20</td><td>'+r.x.toFixed(1)+'</td></tr>'}).join('')+'</table>';
  return picks.map(function(r){return r.p});
}
var origRow=renderPairRow;
renderPairRow=function(){origRow();var s=picksSet();document.querySelectorAll('#jPairRow .pairBtn').forEach(function(b){b.classList.toggle('wkPick',s.has(b.dataset.pair))})};
renderPairRow();
try{var c=JSON.parse(localStorage.getItem('sbWeeklyScan_v1')||'null');if(c){render(c.data,c.t);document.getElementById('wkStatus').textContent='Showing last saved scan.'}}catch(e){}
})();
