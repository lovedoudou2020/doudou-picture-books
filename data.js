/* ===================================================
   豆豆绘本馆 — 绘本数据库 (data.js)
   每本绘本包含: id, title, author, country, emoji,
   coverBg, age, themes[], awards[], summary,
   whyRead, readingTips, origin("中国"|"外国")；
   可选 volumeCount（套装册数；缺省则从 summary「约 N 册」解析，否则按 1 册）
   =================================================== */

// 书目数据已迁移至 books.json（由 scripts/extract_books_to_json.py 生成）
// 页面通过 fetch 加载 books.json → app.js 中的 BOOKS

// ===== 主题定义 =====
const THEMES = [
  {id:"亲情与爱",icon:"❤️",name:"亲情与爱",desc:"爸爸妈妈、祖孙情深",color:"#FFE0E0"},
  {id:"情绪管理",icon:"🌈",name:"情绪管理",desc:"认识情绪、学会调节",color:"#EDE9FE"},
  {id:"想象力",icon:"🚀",name:"想象力与创造力",desc:"天马行空、自由创作",color:"#DBEAFE"},
  {id:"自然探索",icon:"🌿",name:"自然与科学",desc:"动物植物、自然奥秘",color:"#D1FAE5"},
  {id:"科普",icon:"🔬",name:"科学科普",desc:"观察提问、万物原理",color:"#E0F7FA"},
  {id:"友谊合作",icon:"🤝",name:"友谊与合作",desc:"交朋友、学分享",color:"#FEF3C7"},
  {id:"习惯养成",icon:"⭐",name:"习惯养成",desc:"饮食、卫生、守时",color:"#FED7AA"},
  {id:"传统文化",icon:"🏮",name:"传统文化",desc:"节日民俗、中国故事",color:"#FECACA"},
  {id:"生命教育",icon:"🌱",name:"生命教育",desc:"生死、感恩、人生",color:"#E0F2FE"},
  {id:"安全教育",icon:"🛡️",name:"安全教育",desc:"自我保护、身体认知",color:"#FCE7F3"},
  {id:"艺术启蒙",icon:"🎨",name:"艺术与音乐",desc:"绘画、音乐、审美",color:"#FFF7ED"},
  {id:"社会认知",icon:"🧭",name:"社会与认知",desc:"社区生活、职业与资讯",color:"#E2E8F0"},
];

// ===== 奖项定义 =====
const AWARDS_INFO = [
  {id:"caldecott",name:"凯迪克奖",origin:"美国",icon:"🏅",bg:"#FEF3C7",desc:"美国最权威的儿童绘本奖，被誉为绘本界的「奥斯卡」。"},
  {id:"greenaway",name:"凯特·格林纳威奖",origin:"英国",icon:"🎖️",bg:"#E0F2FE",desc:"英国最权威的童书插画奖，与凯迪克奖齐名。"},
  {id:"fengzikai",name:"丰子恺儿童图画书奖",origin:"中国",icon:"🏆",bg:"#FECACA",desc:"首个国际级华文原创儿童图画书奖，以丰子恺先生命名。"},
  {id:"xinyi",name:"信谊幼儿文学奖",origin:"中国",icon:"📜",bg:"#D1FAE5",desc:"中国重要的原创图画书奖项，由信谊基金会设立。"},
  {id:"andersen",name:"国际安徒生奖",origin:"国际",icon:"👑",bg:"#EDE9FE",desc:"国际儿童文学最高荣誉，被誉为「小诺贝尔文学奖」。"},
  {id:"newbery",name:"纽伯瑞奖",origin:"美国",icon:"📖",bg:"#FFF7ED",desc:"美国最权威的儿童文学奖，关注作品文字质量。"},
];

// ===== 《3-6岁儿童学习与发展指南》附件纲要（与教育部通知所附 PDF 目录结构对应；逐条原文以 PDF 为准）=====
const MOE_36_GUIDE_APPENDIX_HTML = `
<section class="moe-guide-appendix" aria-label="指南附件正文纲要">
  <header class="moe-appendix-head">
    <h3 class="moe-appendix-title">附件正文纲要（教育部 PDF 结构对应版）</h3>
    <p class="moe-appendix-lead">教育部通知所附《3-6岁儿童学习与发展指南》PDF 通常包含<strong>说明</strong>与<strong>五大领域分年龄目标与教育建议</strong>。以下按该结构整理<strong>纲要式速览</strong>，便于家长对照亲子共读；具体措辞、分条目标与「教育建议」全文请务必以官网 PDF 为准。</p>
    <p class="moe-appendix-doc"><a href="#" class="js-moe-doc-preview" data-doc="3-6发展指南.doc" role="button">点此查看《3-6发展指南》.doc</a> · <a href="3-6发展指南.doc" download>下载</a></p>
  </header>

  <div class="moe-appendix-block">
    <h4 class="moe-appendix-h4">一、说明（附件开篇要点）</h4>
    <ul class="moe-appendix-ul">
      <li>面向幼儿园教师与<strong>幼儿家长</strong>，帮助理解 3～6 岁幼儿学习与发展的基本规律与特点，建立合理期望。</li>
      <li>从健康、语言、社会、科学、艺术<strong>五个领域</strong>描述幼儿学习与发展的「合理期望」与方向性提示。</li>
      <li>每个领域下设若干<strong>子领域</strong>，再按<strong>3～4岁、4～5岁、5～6岁</strong>三个年龄段给出目标与教育建议的框架。</li>
      <li>强调关注发展的<strong>整体性</strong>、尊重<strong>个体差异</strong>、理解幼儿以<strong>直接经验</strong>为基础的学习方式，重视<strong>学习品质</strong>。</li>
      <li>反对脱离幼儿生活与游戏的「小学化」超前训练；家长可将本纲要作为选书与日常互动的<strong>参照框架</strong>。</li>
    </ul>
  </div>

  <div class="moe-appendix-block">
    <h4 class="moe-appendix-h4">二、健康领域（身心状况 · 动作发展 · 生活习惯与生活能力）</h4>
    <p class="moe-appendix-p">纲要方向：情绪较稳定、能适应集体生活；大肌肉与精细动作逐步发展；作息、卫生、饮食、安全与自理能力养成。</p>
    <div class="moe-appendix-grid">
      <div class="moe-appendix-age"><strong>3～4岁</strong> 情绪相对稳定，愿意参加体育活动；在帮助下能完成简单自理；具备基本卫生习惯与安全常识启蒙。</div>
      <div class="moe-appendix-age"><strong>4～5岁</strong> 能适应环境变化，动作协调增强；能整理个人物品、遵守生活常规；能识别常见危险并求助。</div>
      <div class="moe-appendix-age"><strong>5～6岁</strong> 能主动表达身体不适与情绪；手眼协调与耐力提升；能计划简单任务并坚持完成，具备基本自我保护意识。</div>
    </div>
  </div>

  <div class="moe-appendix-block">
    <h4 class="moe-appendix-h4">三、语言领域（倾听与表达 · 阅读与书写准备）</h4>
    <p class="moe-appendix-p">纲要方向：愿意听、敢说、会表达；喜欢图书与故事，逐步具备前阅读、前书写兴趣与准备（非超前识字攀比）。</p>
    <div class="moe-appendix-grid">
      <div class="moe-appendix-age"><strong>3～4岁</strong> 喜欢听儿歌、短故事；能用词表达自己的需要；愿意翻书、指认画面。</div>
      <div class="moe-appendix-age"><strong>4～5岁</strong> 能复述大意、续编简单情节；对文字符号产生兴趣；能用图画或符号表达想法。</div>
      <div class="moe-appendix-age"><strong>5～6岁</strong> 能较清晰叙述经历与观点；能安静阅读一段时间；对图书与生活里的文字好奇，具备入学语言准备的基础。</div>
    </div>
  </div>

  <div class="moe-appendix-block">
    <h4 class="moe-appendix-h4">四、社会领域（人际交往 · 社会适应）</h4>
    <p class="moe-appendix-p">纲要方向：愿意交往、学习分享与合作；理解并遵守基本规则；对集体与社区有归属感与责任感萌芽。</p>
    <div class="moe-appendix-grid">
      <div class="moe-appendix-age"><strong>3～4岁</strong> 愿意与同伴一起玩；在提示下能遵守简单规则；对家庭和幼儿园有亲近感。</div>
      <div class="moe-appendix-age"><strong>4～5岁</strong> 能协商解决简单冲突；理解角色与轮流；能完成力所能及的任务。</div>
      <div class="moe-appendix-age"><strong>5～6岁</strong> 能合作完成小任务；理解公平与约定；对小学生活有好奇并做好情绪与规则上的准备。</div>
    </div>
  </div>

  <div class="moe-appendix-block">
    <h4 class="moe-appendix-h4">五、科学领域（科学探究 · 数学认知）</h4>
    <p class="moe-appendix-p">纲要方向：亲近自然、乐于观察提问；在操作中感知数量、形状、空间与时间等数学经验。</p>
    <div class="moe-appendix-grid">
      <div class="moe-appendix-age"><strong>3～4岁</strong> 对周围事物好奇，喜欢摆弄材料；能感知大小、多少等明显特征。</div>
      <div class="moe-appendix-age"><strong>4～5岁</strong> 能提出问题并尝试验证；能进行简单分类与排序；对数与量有直觉兴趣。</div>
      <div class="moe-appendix-age"><strong>5～6岁</strong> 能记录简单观察结果；理解部分与整体关系；能在生活中运用数概念与空间方位描述。</div>
    </div>
  </div>

  <div class="moe-appendix-block">
    <h4 class="moe-appendix-h4">六、艺术领域（感受与欣赏 · 表现与创造）</h4>
    <p class="moe-appendix-p">纲要方向：喜欢美的事物；敢于用声音、动作、线条与色彩表达想象与情感。</p>
    <div class="moe-appendix-grid">
      <div class="moe-appendix-age"><strong>3～4岁</strong> 喜欢听音乐、看图画；愿意模仿与涂鸦，享受过程。</div>
      <div class="moe-appendix-age"><strong>4～5岁</strong> 能发现环境中的美；能用多种材料创作；愿意在集体前展示。</div>
      <div class="moe-appendix-age"><strong>5～6岁</strong> 能欣赏并简单评价同伴作品；有初步的创意表达与坚持完成作品的意愿。</div>
    </div>
  </div>

  <p class="moe-appendix-foot">以上纲要为<strong>附件 PDF 的结构化归纳</strong>，并非对原文的逐字转载。下载或打开教育部通知页面中的<strong>指南 PDF 附件</strong>，可查看各子领域下的<strong>分条目标与教育建议</strong>全文。</p>
</section>`;

// ===== 教育资讯（家长向；每条需唯一 id 供站内详情页 data-news-id）=====
const EDU_NEWS_ITEMS = [
  {
    id: "youth-reading-action",
    tag: "政策",
    date: "2023 起",
    title: "全国青少年学生读书行动",
    summary: "教育部等部门持续推进面向中小学生的阅读促进与书香校园建设，倡导家校协同培养阅读习惯。学龄前家庭可提前关注亲子共读与语言环境营造，为入学后阅读打基础。具体条文与最新通知请以教育部官网发布为准。",
    detail:
      "「全国青少年学生读书行动」由教育部等部门推动，面向中小学生阅读促进与书香校园建设，倡导家校协同培养阅读习惯。\n\n学龄前家庭不必照搬中小学政策条文，可提前关注两件事：一是每天固定的亲子共读时间；二是多对话、少电子屏，为入学后的阅读兴趣打基础。\n\n具体通知名称、实施年份与地方细则可能更新，请以教育部官网检索到的最新发布为准。",
    url: "https://www.moe.gov.cn/",
    urlLabel: "教育部官网",
  },
  {
    id: "kindergarten-readiness",
    tag: "幼小衔接",
    date: "持续更新",
    title: "幼儿园入学准备与语言发展",
    summary: "多地教育部门与园所强调「去小学化」与游戏化学习，同时重视倾听表达与阅读兴趣。家长可配合园所节奏，以绘本为媒做情绪与认知准备，避免超前机械识字。",
    detail:
      "幼小衔接阶段，多地教育部门和幼儿园强调「去小学化」与游戏化学习，同时重视倾听表达与阅读兴趣。\n\n家庭可配合园所节奏：用绘本做情绪命名、预测情节、复述故事，而不是超前机械识字攀比。\n\n各地政策表述与资源入口不同，家长可在省级教育厅、市级教育局官网检索「幼小衔接」「学前教育」等关键词获取本地说明。",
    url: "https://www.moe.gov.cn/",
    urlLabel: "教育部 · 检索幼小衔接 / 学前教育",
  },
  {
    id: "nlc-youth-reading",
    tag: "公共阅读",
    date: "常年",
    title: "国家图书馆少年儿童服务与书单推荐",
    summary: "国图面向少儿读者提供书目推荐与阅读推广活动；「四季童读」等书单可作为家庭选书参考，与本馆「网上新书」区部分来源一致。",
    detail:
      "国家图书馆面向少年儿童提供书目推荐、阅读推广与活动信息；「四季童读」等书单可作为家庭选书参考之一。\n\n本馆「网上新书」区部分书目与国图等公开书单来源有交叉，家长可将国图推荐与家庭书单、园所推荐交叉比对。\n\n活动日期、报名办法与书单卷次请以国图官网及公众号最新发布为准。",
    url: "https://www.nlc.cn/",
    urlLabel: "中国国家图书馆",
  },
  {
    id: "myopia-reading-light",
    tag: "健康",
    date: "提醒",
    title: "近视防控与亲子共读光线环境",
    summary: "国家卫健委等部门发布的近视防控要点中，强调减少长时间近距离用眼、注意采光与用眼休息。睡前共读时注意台灯与房间主灯搭配，控制单次时长。",
    detail:
      "国家卫生健康委员会等部门发布的近视防控科普要点中，常见建议包括：控制近距离用眼时长、增加白天户外活动时间、注意读写采光与休息。\n\n亲子共读时建议：顶灯与台灯同时打开、书本与屏幕亮度与环境光协调；睡前共读控制单次时长，读完可做远眺或闭目休息。\n\n具体医学建议与地方筛查政策请以卫健委及当地医疗卫生机构最新发布为准。",
    url: "https://www.nhc.gov.cn/",
    urlLabel: "国家卫生健康委员会官网",
  },
  {
    id: "unesco-literacy",
    tag: "国际视野",
    date: "每年 9 月前后",
    title: "联合国教科文组织：扫盲与终身学习",
    summary: "国际扫盲日等活动聚焦全民阅读与终身学习。可借鉴其「阅读即权利」理念，在家庭中营造无压力的阅读氛围，而非攀比识字量。",
    detail:
      "联合国教科文组织倡导全民阅读与终身学习，国际扫盲日等活动常聚焦「阅读作为基本权利」的理念。\n\n在学龄前家庭中，可借鉴的是：把阅读当作日常陪伴的一部分，减少「识字量攀比」带来的压力，让孩子对书保持好奇与安全感。\n\n活动主题与年份不同，请以教科文组织中文官网最新页面为准。",
    url: "https://www.unesco.org/zh/",
    urlLabel: "联合国教科文组织（中文）",
  },
  {
    id: "local-reading-events",
    tag: "实用提示",
    date: "本地",
    title: "如何获取身边的少儿阅读活动信息",
    summary: "可关注本省/市图书馆、少年儿童图书馆、博物馆的官方公众号或活动页，获取故事会、展览与假期阅读营等资讯；与幼儿园家委会信息互为补充。",
    detail:
      "少儿阅读活动信息常见来源包括：省/市图书馆与少年儿童图书馆的官网与公众号、博物馆的亲子活动页、正规出版社与书店的共读活动预告等。\n\n可与幼儿园家委会、班级通知互为补充；报名前留意活动时间、年龄要求与安全提示。\n\n本条目无单一权威外链，请家长以本地公共机构官方渠道为准。",
  },
];
