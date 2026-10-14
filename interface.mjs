// Presentation only: on-demand panels retain the existing game controls and saves.
const panels=[...document.querySelectorAll('.game-panel')];
const qa=new URL(location.href).searchParams.get('qa')==='1';
document.getElementById('qa-launch').hidden=!qa;
let opener=null,position=0;
function openPanel(id,button){
 const panel=document.getElementById(id);
 if(!panel?.classList.contains('game-panel')||(id==='qa-panel'&&!qa))return;
 if(panel.open)return;
 for(const other of panels)if(other.open)other.close();
 opener=button;position=scrollY;
 panel.showModal();document.body.classList.add('panel-open');
}
export function closeGamePanels(){for(const panel of panels)if(panel.open)panel.close();}
export function refreshChoices(){
 for(const group of document.querySelectorAll('[data-choice]')){const value=document.getElementById(group.dataset.choice).value;for(const button of group.querySelectorAll('[data-value]'))button.setAttribute('aria-pressed',String(button.dataset.value===value));}
}
document.addEventListener('click',event=>{
 const choice=event.target.closest('[data-choice] [data-value]');
 if(choice){const model=document.getElementById(choice.closest('[data-choice]').dataset.choice);model.value=choice.dataset.value;model.dispatchEvent(new Event('change',{bubbles:true}));refreshChoices();return;}
 const trigger=event.target.closest('[data-open-panel]');
 if(trigger){event.preventDefault();openPanel(trigger.dataset.openPanel,trigger);return;}
 const close=event.target.closest('[data-close-panel]');
 if(close)close.closest('.game-panel').close();
});
for(const panel of panels)panel.addEventListener('close',()=>{
 if(panels.some(other=>other.open))return;
 document.body.classList.remove('panel-open');
 window.scrollTo(0,position);opener?.focus({preventScroll:true});
});

refreshChoices();
