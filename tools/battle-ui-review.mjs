// Existing behavioral reviews still exercise their original control IDs.
// Reveal the new drawer/popover, or use the primary merc's visible reload.
export async function openBattleDrawer(page){
 if(await page.locator('#command-drawer').count()&&!await page.locator('#command-drawer').isVisible())await page.click('#drawer-toggle');
}
export async function clickBattleControl(page,selector){
 if(!await page.locator('#command-rail').count()){await page.click(selector);return;}
 if(selector==='#reload'){
  const id=await page.evaluate(()=>battle3d.state.selected);await page.locator('.merc-card[data-unit="'+id+'"] .weapon-row.held .weapon-reload').click();return;
 }
 if(selector.startsWith('#stance-')){
  if(!await page.locator('#stance-menu').isVisible()){const id=await page.evaluate(()=>battle3d.state.selected);await page.locator('.merc-card[data-unit="'+id+'"] .merc-stance').click();}
 }else if(!await page.locator(selector).isVisible())await openBattleDrawer(page);
 await page.click(selector);
 if(!await page.locator('dialog[open]').count()&&await page.locator('#command-drawer').isVisible())await page.click('#drawer-toggle');
}
export async function selectBattleOption(page,selector,value){
 if(!await page.locator(selector).isVisible())await openBattleDrawer(page);
 await page.selectOption(selector,value);
 if(await page.locator('#command-drawer').count()&&await page.locator('#command-drawer').isVisible())await page.click('#drawer-toggle');
}
