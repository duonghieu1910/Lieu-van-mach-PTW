/* =========================================================================
   TAB SWITCHING (top-level) — generic, supports any number of tabs.
   Each tab button must have a matching data-panel id and an optional
   data-oncompute function name (called on the window object) to refresh
   that tab's numbers when it becomes visible.
   ========================================================================= */
const TAB_BUTTONS = [
  { btn:'topTabVM', panel:'panelVM', onShow: null },
  { btn:'topTabTB', panel:'panelTB', onShow: 'tbCompute' },
  { btn:'topTabKS', panel:'panelKS', onShow: 'ksCompute' },
];

function showTab(activeId){
  TAB_BUTTONS.forEach(t=>{
    const btnEl = document.getElementById(t.btn);
    const panelEl = document.getElementById(t.panel);
    const isActive = t.btn === activeId;
    btnEl.classList.toggle('active', isActive);
    panelEl.style.display = isActive ? 'block' : 'none';
    if(isActive && t.onShow && typeof window[t.onShow] === 'function'){
      window[t.onShow]();
    }
  });
}

TAB_BUTTONS.forEach(t=>{
  document.getElementById(t.btn).addEventListener('click', ()=> showTab(t.btn));
});
