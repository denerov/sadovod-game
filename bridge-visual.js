export function applyBridgeVisual(image,frame,mask=0){
 const src=frame.bridgeVariants?.[mask];
 if(!src)return;
 image.dataset.bridgeSource=src;
 if(image.getAttribute('href')!==src)image.setAttribute('href',src);
}
