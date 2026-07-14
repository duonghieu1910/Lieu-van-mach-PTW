/* =========================================================================
   TAB SWITCHING (top-level)
   ========================================================================= */
const topTabVM = document.getElementById('topTabVM');
const topTabTB = document.getElementById('topTabTB');
const panelVM = document.getElementById('panelVM');
const panelTB = document.getElementById('panelTB');

topTabVM.addEventListener('click', ()=>{
  topTabVM.classList.add('active'); topTabTB.classList.remove('active');
  panelVM.style.display='block'; panelTB.style.display='none';
});
topTabTB.addEventListener('click', ()=>{
  topTabTB.classList.add('active'); topTabVM.classList.remove('active');
  panelTB.style.display='block'; panelVM.style.display='none';
  tbCompute();
});
