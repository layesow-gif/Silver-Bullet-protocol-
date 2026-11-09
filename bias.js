/* Week bias board: multi-day pair directions from the saved weekly scan (load after weekly.js) */
(function(){
var a=document.getElementById('wkPicks');a=a&&a.closest('.card');
if(!a)return;
a.insertAdjacentHTML('afterend','<div class="card"><div class="cardTitle">Week bias board (multi-day)</div><div id="wbOut"><span class="wkSub">Run the weekly scan to fill this in.</span></div><div class="fxNote">Built from the saved weekly scan, so it uses no extra API credits. Dots: base currency agrees, quote currency agrees, 1-week move agrees, EMA trend agrees. Green = agrees, red = conflicts. USD lean uses USD strength across your pairs as the DXY stand-in.</div></div>');
function sg(x){return x>0?1:-1}
function draw(){
  var c;try{c=JSON.parse(localStorage.getItem('sbWeeklyScan_v1')||'null')}catch(e){}
  if(!c||!c.data)return;
  var data=c.data,s1={},s4={},ct={};
  Object.keys(data).forEach(function(p){var d=data[p];[[p.slice(0,3),1],[p.slice(3),-1]].forEach(function(x){var k=x[0],m=x[1];s1[k]=(s1[k]||0)+m*d.r1;s4[k]=(s4[k]||0)+m*d.r4;ct[k]=(ct[k]||0)+1})});
  Object.keys(ct).forEach(function(k){s1[k]/=ct[k];s4[k]/=ct[k]});
  var u4=s4.USD||0,u1=s1.USD||0,lean=Math.abs(u4)<0.15?'flat':(u4>0?'strong':'weak');
  var msg=lean==='strong'?'USD strong over 4 weeks: favor shorts on XXXUSD, longs on USDXXX.':lean==='weak'?'USD weak over 4 weeks: favor longs on XXXUSD, shorts on USDXXX.':'USD flat: treat USD pairs as neutral.';
  if(lean!=='flat'&&sg(u1)!==sg(u4))msg+=' The 1-week move points the other way, so a turn may be starting.';
  var h='<div class="wkSub" style="margin-bottom:4px">USD lean (4W '+(u4>=0?'+':'')+u4.toFixed(2)+'%, 1W '+(u1>=0?'+':'')+u1.toFixed(2)+'%)</div><div style="margin-bottom:10px"><span class="'+(lean==='strong'?'wkL':lean==='weak'?'wkS':'wkSub')+'">USD '+lean.toUpperCase()+'</span> <span class="wkSub">'+msg+'</span></div>';
  var rows=Object.keys(data).map(function(p){
    var d=data[p],b=p.slice(0,3),q=p.slice(3),sp=s4[b]-s4[q],dir=sg(d.r4);
    var dots=[sg(s4[b])===dir,sg(-s4[q])===dir,sg(d.r1)===dir,dir*(d.p-d.e50)>0&&dir*(d.e50-d.e200)>0];
    return{p:p,dir:dir,dots:dots,n:dots.filter(Boolean).length,r4:d.r4,neu:Math.abs(sp)<0.15};
  });
  rows.sort(function(x,y){return (x.neu-y.neu)||(y.n-x.n)||(Math.abs(y.r4)-Math.abs(x.r4))});
  h+='<div class="wkScroll"><table class="wkTbl"><tr><th>Pair</th><th>Bias</th><th>Dots</th><th>Read</th><th>4W %</th></tr>'+rows.map(function(r){
    var read=r.neu?'Neutral':r.n===4?'Clear':r.n===3?'Likely':'Mixed';
    var dots=r.dots.map(function(o){return '<span style="color:'+(o?'#34d399':'#fb7185')+'">●</span>'}).join('');
    return '<tr><td>'+r.p+'</td><td class="'+(r.neu?'wkSub':r.dir>0?'wkL':'wkS')+'">'+(r.neu?'-':r.dir>0?'Long':'Short')+'</td><td>'+dots+'</td><td>'+read+'</td><td>'+(r.r4>=0?'+':'')+r.r4.toFixed(2)+'</td></tr>';
  }).join('')+'</table></div>';
  document.getElementById('wbOut').innerHTML=h;
}
var o=renderPairRow;renderPairRow=function(){o();draw()};
draw();
})();
