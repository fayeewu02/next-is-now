/* Entirely fictional examples explicitly requested for this Demo.
   No search API, real author, real post URL, cooking ratio or heating parameter is used. */
(() => {
  const m=(id,label)=>({id,label,optional:false});
  const examples=[
    {id:'demo-felt-glue',items:['saved-05'],handles:['needle'],remove:['needle'],add:[m('fabricglue','布艺胶（新方案需要）')],title:'免缝版蛋糕相框（演示）',minutes:120,author:'手作演示号',change:'把针线固定改为布艺胶固定；仍使用不织布，但需要额外准备布艺胶。',summary:'模拟帖子演示：保留蛋糕相框造型，用免缝粘合方式代替缝制。',steps:['先按照片尺寸摆好相框底板、窗口和装饰。','用适用于所选材料的布艺胶固定裁片，使用和等待方式按真实产品说明。','确认各部件固定后，再放入照片。此处只演示方案变化，不是原作者教程。']},
    {id:'demo-paper-frame',items:['saved-05'],handles:['needle','felt'],remove:['needle','felt','decor'],add:[m('coloredpaper','彩色厚纸'),m('craftglue','纸艺胶')],title:'蛋糕造型纸相框（演示）',minutes:30,author:'纸艺演示号',change:'由不织布相框改为纸相框，不需要针线或不织布；质感与耐用性不同。',summary:'模拟帖子演示：保留照片窗口与蛋糕配色，换成裁剪和粘贴纸片的玩法。',steps:['在厚纸上按照片尺寸画出外框和窗口。','剪出纸片装饰，先摆好蛋糕和水果的布局。','按纸艺胶的真实说明粘贴并等待固定，再把照片放进去。']},
    {id:'demo-pixel-paper',items:['saved-01'],handles:['beads','board','iron','paper'],remove:['beads','board','iron','paper','tweezers'],add:[m('coloredpaper','彩色厚纸'),m('scissors','剪刀'),m('craftglue','纸艺胶'),m('photo','一张小照片')],title:'像素纸片小相框（演示）',minutes:30,author:'像素手作演示号',change:'把拼豆改为像素纸片拼贴，不再使用熨烫工具；不是原拼豆作品的制作方法。',summary:'模拟帖子演示：保留像素风，把小纸片拼成照片边框。',steps:['先量好照片，画出纸相框窗口。','把彩色纸剪成小纸片，先试摆一段像素轮廓。','按胶的真实使用说明固定纸片与照片，完成纸艺体验。']},
    {id:'demo-plain-paper',items:['saved-16','saved-17'],handles:['xuanpaper'],remove:['xuanpaper'],add:[m('practicepaper','普通练习纸')],title:'{subtype}练习 · 普通纸版（演示）',minutes:18,author:'练字演示号',change:'用普通练习纸代替宣纸，纸张吸墨和呈现效果可能不同；只演示短时试练。',summary:'模拟帖子演示：用已有纸张体验基础线条，不追求原图纸上的效果。',steps:['铺好普通练习纸和已有的桌面保护材料。','少量试墨，观察纸张能否用于这次简单体验。','只练一小组线条，保留练习结果。示例不代表原作者的替代方案。']},
    {id:'demo-no-egg-noodles',items:['saved-19'],handles:['egg'],remove:['egg'],add:[],title:'无皮蛋版肉酱拌面（演示）',minutes:25,author:'小厨房演示号',change:'省去皮蛋，保留肉酱与面条；味道和口感不再与原收藏一致。',summary:'模拟帖子演示：当手边没有皮蛋时，把目标改为一份肉酱拌面。',steps:['先核对面条、肉类、调味料与锅具。','此演示将流程改为准备肉酱，不再处理皮蛋；实际用量和熟制要求需可靠配方。','按真实做法处理面条并组合。这里不提供可直接照做的烹饪参数。']},
    {id:'demo-tomato-noodles',items:['saved-19'],handles:['egg'],remove:['egg'],add:[m('tomato','番茄（新方案需要）')],title:'番茄肉酱面（演示）',minutes:35,author:'番茄厨房演示号',change:'用番茄口味替代原来的皮蛋组合，增加番茄与准备时间；需要确认新材料。',summary:'模拟帖子演示：另选一种肉酱面思路，不把番茄当成皮蛋的等效替代。',steps:['核对原有材料，并另外准备番茄。','按你选定的可靠配方处理番茄与肉酱；此实例只演示新的流程结构。','再安排面条与组合步骤，不据演示数据猜测温度、份量或熟制时间。']},
    {id:'demo-plain-daifuku',items:['saved-11'],handles:['matcha'],remove:['matcha'],add:[],title:'原味草莓大福（演示）',minutes:65,author:'甜品演示号',change:'不使用抹茶，改为原味；颜色和风味改变，其余材料仍需核对。',summary:'模拟帖子演示：保留草莓大福目标，改选无抹茶的口味版本。',steps:['先确认草莓、粉类、馅料和加热设备。','按可靠的原味配方核对粉类比例与操作；这个实例未提供具体配比。','模拟流程继续为放凉、包馅与记录，不代表真实原帖教程。']},
    {id:'demo-no-bacon',items:['saved-21'],handles:['bacon'],remove:['bacon'],add:[],title:'芝士虾滑小食（演示）',minutes:30,author:'小食演示号',change:'不再使用培根，也不再做成培根卷；成品形态和口味不同。',summary:'模拟帖子演示：保留虾滑与芝士，另选不包培根的小食玩法。',steps:['核对虾滑、芝士、烹饪设备和所需调味料。','此实例把目标改为不包培根的小食，实际做法与海鲜熟制要求需可靠配方。','按真实操作完成后记录；本演示不提供烹饪温度与火候。']}
  ];
  window.NEXT_NOW_DEMO_ALTERNATIVES=examples;
  window.NEXT_NOW_BUILD_DEMO_ALTERNATIVES=(item,missing)=>{
    const ids=new Set(missing),essential=item.materials.filter(m=>ids.has(m.id)&&!m.optional).map(m=>m.id);
    return examples.filter(v=>v.items.includes(item.id)&&essential.every(id=>v.handles.includes(id))).map(v=>({
      id:v.id,title:v.title.replace('{subtype}',item.subtype),category:item.category,minutes:v.minutes,author:v.author,change:v.change,summary:v.summary,steps:[...v.steps],
      materials:[...item.materials.filter(m=>!v.remove.includes(m.id)&&!ids.has(m.id)).map(m=>({...m})),...v.add.map(m=>({...m}))],
      added:v.add.map(m=>m.label),missing:item.materials.filter(m=>ids.has(m.id)).map(m=>m.label),originalTitle:item.title,originId:item.id,
      sourceLabel:'模拟小红书结果 · 演示帖子',isDemo:true,
      notice:'标题、账号、步骤和时长均为 Demo 虚构内容，未联网搜索，不是真实小红书帖子或可直接照做的完整教程。'
    }));
  };
})();
