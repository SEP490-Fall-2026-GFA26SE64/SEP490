import { useEffect, type RefObject } from 'react'

/** Section navigation is local to Overview; nested scrollers and dialogs keep native input. */
export function useOverviewSectionScroll(root: RefObject<HTMLDivElement | null>, enabled: boolean) {
  const alignGraph = () => {
    requestAnimationFrame(() => {
      const graph=root.current?.querySelector<HTMLElement>('.journey-stage')
      if(!graph)return
      const header=document.querySelector('.workspace-header')?.getBoundingClientRect().bottom??0
      graph.style.scrollMarginTop=`${header+12}px`
      graph.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})
    })
  }
  useEffect(()=>{
    const host=root.current
    if(!host||!enabled)return
    let scrollParent:HTMLElement|null=host.parentElement
    while(scrollParent&&!/(auto|scroll)/.test(getComputedStyle(scrollParent).overflowY))scrollParent=scrollParent.parentElement
    const parent=scrollParent
    const top=()=>parent?parent.scrollTop:window.scrollY
    const viewport=()=>parent?parent.clientHeight:window.innerHeight
    const base=()=>parent?parent.getBoundingClientRect().top:0
    const header=()=>Math.max(0,(document.querySelector('.workspace-header')?.getBoundingClientRect().bottom??0)-base())+12
    const position=(el:HTMLElement)=>Math.max(0,el.getBoundingClientRect().top-base()+top()-header())
    let lockedUntil=0,lastInput=0,delta=0
    const wheel=(event:WheelEvent)=>{
      if(event.ctrlKey||event.metaKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)||!event.deltaY||document.querySelector('[role="dialog"][aria-modal="true"]'))return
      let target=event.target instanceof HTMLElement?event.target:null
      while(target&&target!==host&&target!==parent){
        const css=getComputedStyle(target)
        if(/(auto|scroll)/.test(css.overflowY)&&target.scrollHeight>target.clientHeight+1)return
        target=target.parentElement
      }
      const graph=host.querySelector<HTMLElement>('.journey-stage'),list=host.querySelector<HTMLElement>('[aria-labelledby="overview-skill-progress-title"]')
      if(!graph||!list)return
      const now=performance.now(),idle=now-lastInput;lastInput=now
      if(now<lockedUntil||idle<180&&lockedUntil>0){event.preventDefault();return}
      if(idle>180)delta=0
      delta+=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?viewport():1)
      if(Math.abs(delta)<16)return
      const down=delta>0;delta=0
      const points=[position(host),position(graph),position(list)].sort((a,b)=>a-b)
      const current=top(),usable=Math.max(120,viewport()-header()-16)
      const destination=down?points.find(point=>point>current+16):[...points].reverse().find(point=>point<current-16)
      if(destination===undefined)return
      // Read tall graph/list sections in viewport-sized steps rather than skipping hidden content.
      const active=down?points.filter(point=>point<=current+16).at(-1):points.find(point=>point>=current-16)
      const distance=Math.abs(destination-current)
      const next=distance>usable+24&&active!==undefined
        ? current+(down?1:-1)*usable : destination
      event.preventDefault();lockedUntil=now+650
      const options:ScrollToOptions={top:Math.max(0,next),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}
      if(parent)parent.scrollTo(options);else window.scrollTo(options)
    }
    host.addEventListener('wheel',wheel,{passive:false})
    return ()=>host.removeEventListener('wheel',wheel)
  },[root,enabled])
  return alignGraph
}
