'use strict';

/**
 * 大学生简历与面试 AI 智能体 —— 核心引擎
 * 五项功能：简历诊断 / 简历润色 / 模拟面试 / 题库生成 / 求职提示
 * 设计原则：辅助不代写、真实不虚构、分点口语化
 */

// ============ 伦理话术（三处复用）============
const OPENING =
  '你好！我是「大学生简历与面试 AI 智能体」，可以帮你诊断简历、润色措辞、模拟面试、生成面试题库并给出求职提示。\n\n' +
  '⚠️ 重要提示：我仅作求职辅助工具，简历与面试内容请以你本人的真实经历和独立思考为主，请勿直接复制我生成的内容去投递简历或在面试中照读。\n\n' +
  '你可以直接粘贴简历，或告诉我目标岗位，我们开始吧。';

const ETHICS_FOOT = '\n\n—— 我仅作求职辅助，以上内容请以你的真实经历为准，请勿照搬投递或面试照读。';

// ============ 意图识别 ============
const INTENTS = [
  {
    key: 'diagnose',
    name: '简历诊断',
    kw: ['诊断', '检查简历', '看看简历', '分析简历', '简历问题', '简历怎么样', '帮我看', '简历评估', '有什么问题']
  },
  {
    key: 'polish',
    name: '简历润色',
    kw: ['润色', '优化', '改进', '改写', '措辞', '表达', '怎么写更好', '润色一下', '美化']
  },
  {
    key: 'interview',
    name: '模拟面试',
    kw: ['模拟面试', '面试我', '开始面试', '模拟', '面试练习', '问我', '继续', '下一题', '作答', '回答']
  },
  {
    key: 'bank',
    name: '面试题库',
    kw: ['题库', '面试题', '题目', '出题', '高频题', '常见问题', '往年题', '问题清单']
  },
  {
    key: 'tips',
    name: '求职提示',
    kw: ['投递', '选岗', '避坑', '求职', '注意', '建议', '提醒', '怎么找', '简历投递', '面试注意', '坑']
  }
];

function detectIntent(text, session) {
  // 模拟面试进行中：任何输入都当作作答，除非明确退出
  if (session && session.mode === 'interview') {
    if (/退出|结束|不面了|停|取消/.test(text)) {
      session.mode = null;
      return { key: 'exit', name: '退出面试' };
    }
    return { key: 'answer', name: '面试作答' };
  }
  const t = text.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const it of INTENTS) {
    let score = 0;
    for (const k of it.kw) if (t.includes(k)) score += k.length;
    if (score > bestScore) { bestScore = score; best = it; }
  }
  if (bestScore > 0) return best;
  // 含简历长文本默认诊断
  if (t.length > 120 && /简历|经历|实习|项目|教育|技能/.test(t)) {
    return { key: 'diagnose', name: '简历诊断' };
  }
  return { key: 'unknown', name: '未识别' };
}

// ============ 伦理拦截 ============
const FABRICATE_RE = /(编|造|虚构|捏造|造假|杜撰|假).{0,8}(简历|经历|实习|项目|证书|数据|成果)|(简历|经历|实习|项目|证书|数据).{0,8}(编|造|虚构|捏造|造假|杜撰)/;

function ethicsGuard(text) {
  if (FABRICATE_RE.test(text)) {
    return '这个忙我帮不了。\n\n' +
      '我不能替你编造实习经历、项目、证书或数据——这属于简历造假，一旦被发现会影响录用甚至取消资格，也违背诚信原则。\n\n' +
      '但我可以帮你：\n' +
      '1. 把你**真实做过**的事，用更专业、更有条理的方式表达出来；\n' +
      '2. 帮你梳理哪些真实经历还没写清楚、怎么补充细节和数据；\n' +
      '3. 针对你的真实经历，设计能体现能力的表述。\n\n' +
      '把你真实的经历发给我，我们一起把它写好。' + ETHICS_FOOT;
  }
  return null;
}

// ============ 功能一：简历诊断 ============
function diagnoseResume(text, session) {
  if (text.length < 40) {
    return '请把简历内容粘贴给我（可以直接复制简历文字），我来按四个维度帮你诊断。\n\n' +
      '建议包含：个人信息、教育经历、实习/项目经历、技能证书。内容越完整，诊断越具体。' + ETHICS_FOOT;
  }
  const t = text;
  const hasPhone = /1[3-9]\d{9}/.test(t);
  const hasEmail = /[\w.+-]+@[\w.-]+\.\w+/.test(t);
  const hasEdu = /教育|学历|学校|学院|大学|专科|本科|专业/.test(t);
  const hasExp = /实习|项目|经历|工作|兼职|实践/.test(t);
  const hasSkill = /技能|证书|掌握|熟悉|熟练|语言|计算机/.test(t);
  const nums = (t.match(/\d+(.%|人|万|元|次|个|天|小时|倍|%)/g) || []).length;
  const strongVerbs = (t.match(/负责|主导|搭建|优化|实现|设计|分析|完成|提升|开发|运营|统筹|推进/g) || []).length;
  const weakVerbs = (t.match(/参与|协助|了解|接触|帮忙|做过|做过一些/g) || []).length;

  const issues = [];
  if (!hasPhone || !hasEmail) issues.push('**联系信息**：未见完整手机号/邮箱，HR 可能联系不到你。');
  if (!hasEdu) issues.push('**教育经历**：没看到学校、专业、学历信息，这是简历的基本盘。');
  if (!hasExp) issues.push('**实践经历**：缺少实习/项目/兼职内容，这是大专生最该突出的部分。');
  if (!hasSkill) issues.push('**技能证书**：未体现技能或证书，建议单列一栏。');
  if (nums < 3) issues.push('**量化程度**：通篇数字少于 3 处。试着给成果加上数字，如"整理 200+ 条数据""效率提升 30%"。');
  if (weakVerbs > strongVerbs) issues.push('**动词力度**："参与/协助/了解"这类弱动词偏多，建议换成你实际承担的动作，如"负责""搭建""优化"。');

  const scores = {
    '结构完整度': (hasPhone && hasEmail ? 25 : 10) + (hasEdu ? 25 : 8) + (hasExp ? 25 : 8) + (hasSkill ? 25 : 8),
    '表达具体度': Math.min(100, 40 + strongVerbs * 8 - weakVerbs * 4),
    '量化程度': Math.min(100, nums * 18 + 15),
    '岗位匹配度': hasExp && hasSkill ? 80 : 55
  };

  let out = '我按四个维度看了一遍你的简历，逐条说：\n\n';
  out += '**一、结构完整度** ' + scores['结构完整度'] + '/100\n';
  out += issues.filter(x => /联系|教育|实践|技能/.test(x)).map(x => '- ' + x).join('\n') || '- 结构基本齐全，保持。';
  out += '\n\n**二、表达具体度** ' + scores['表达具体度'] + '/100\n';
  out += '- 强动词（负责/搭建/优化等）出现 ' + strongVerbs + ' 次，弱动词（参与/协助/了解）' + weakVerbs + ' 次。' +
    (weakVerbs > strongVerbs ? '弱动词偏多，建议改成你实际承担的具体动作。' : '动词使用不错，继续保持具体。');
  out += '\n\n**三、量化程度** ' + scores['量化程度'] + '/100\n';
  out += '- 检测到 ' + nums + ' 处数字。' + (nums < 3 ? '建议至少补到 3 处以上，用数据说话更有说服力。' : '量化表达较充分。');
  out += '\n\n**四、岗位匹配度** ' + scores['岗位匹配度'] + '/100\n';
  out += issues.filter(x => /实践|技能/.test(x)).map(x => '- ' + x).join('\n') || '- 经历与技能有体现，建议针对目标岗位再精简无关内容。';
  out += '\n\n**优先改这三点**：\n';
  out += '1. 先补齐缺失的模块（联系信息/教育/实践/技能）；\n' +
    '2. 每段经历加 1-2 个数字；\n' +
    '3. 把"参与/协助"换成你真正做的事。\n\n';
  out += '需要我帮你润色其中某一段吗？把那段发我就行。' + ETHICS_FOOT;
  session.lastResume = text;
  return out;
}

// ============ 功能二：简历润色 ============
function polishResume(text, session) {
  if (text.length < 15) {
    return '把你想润色的那段经历发给我（比如"我做过一个海报，参与过社团活动"），我来帮你改。\n\n' +
      '记得告诉我目标岗位方向，比如"AI运维实习""数据分析实习"，这样我能对准关键词。' + ETHICS_FOOT;
  }
  let polished = text;
  const replacements = [
    [/帮忙|帮着/g, '协助'],
    [/做过/g, '负责'],
    [/参与了?/g, '参与完成'],
    [/了解了?/g, '学习并掌握'],
    [/接触过?/g, '实际使用'],
    [/做了/g, '完成'],
    [/搞了/g, '搭建']
  ];
  const changes = [];
  for (const [re, to] of replacements) {
    if (re.test(polished)) {
      polished = polished.replace(re, to);
      changes.push('把口语化的"' + re.source.replace(/[\\/()?+]/g, '') + '"换成更专业的"' + to + '"');
    }
  }
  const hasNum = /\d/.test(polished);
  if (!hasNum) changes.push('建议补一个数字，比如"覆盖多少人""提升多少效率"（用你的真实数据）');

  let out = '我在**不虚构经历**的前提下，帮你润色了一下：\n\n';
  out += '**润色版本**：\n' + polished + '\n\n';
  out += '**修改说明**：\n';
  out += changes.map((x, i) => (i + 1) + '. ' + x).join('\n') || '1. 原文表达已经比较简洁，可保持。';
  out += '\n\n**再进一步的两个建议**：\n';
  out += '- 用"**做了什么 + 怎么做 + 结果如何**"的结构重写，比如"负责XX → 通过XX方式 → 使XX提升XX"；\n' +
    '- 补数字时务必用你的真实数据，我给的是结构，不是替你编的内容。\n\n';
  out += '要不要把润色后的整段再发我，我帮你按四维度复查一遍？' + ETHICS_FOOT;
  return out;
}

// ============ 题库数据 ============
const BANKS = {
  'AI运维实习': {
    general: ['简单介绍一下你自己', '为什么选择我们这个岗位', '你怎么看待加班和值班'],
    pro: ['Linux 常用命令有哪些？怎么查日志', 'Docker 容器和虚拟机的区别', 'AI 模型服务部署的基本流程是什么'],
    behavior: ['遇到过最难排查的故障是什么，怎么解决的', '和同学协作出过分歧吗，怎么处理']
  },
  '数据分析实习': {
    general: ['简单介绍一下你自己', '你对数据分析岗位的理解'],
    pro: ['Excel 数据透视表怎么用', 'SQL 的 group by 和 where 区别', '拿到一份数据你会怎么开始分析'],
    behavior: ['用过什么工具做过什么分析项目', '数据出错时你怎么处理']
  },
  'AI应用开发': {
    general: ['简单介绍一下你自己', '你做过最有成就感的项目'],
    pro: ['什么是提示词工程，怎么优化提示词', 'RAG 的基本原理是什么', '调用大模型 API 的基本流程'],
    behavior: ['遇到模型回答不理想你怎么调试', '怎么和团队分工完成项目']
  },
  '通用': {
    general: ['简单介绍一下你自己', '你的优缺点分别是什么', '为什么选择这个岗位'],
    pro: ['你掌握哪些专业技能', '描述一个你完成的项目'],
    behavior: ['遇到压力大的事情怎么应对', '你怎么快速学习一个新东西']
  }
};

function pickBank(role) {
  for (const k of Object.keys(BANKS)) if (role.includes(k) || k.includes(role)) return BANKS[k];
  return BANKS['通用'];
}

function extractRole(text) {
  const m = text.match(/(AI运维实习|数据分析实习|AI应用开发|人工智能|计算机|运维|数据分析|开发|算法)/);
  return m ? (m[1] === '人工智能' || m[1] === '计算机' ? 'AI应用开发' :
    m[1] === '运维' ? 'AI运维实习' :
    m[1] === '数据分析' || m[1] === '算法' ? '数据分析实习' :
    m[1] === '开发' ? 'AI应用开发' : m[1]) : '通用';
}

// ============ 功能三：面试题库生成 ============
function generateBank(text) {
  const role = extractRole(text);
  const b = pickBank(role);
  let out = '给你一套「' + role + '」方向的高频面试题，按三类整理，每题附答题思路：\n\n';
  out += '**一、通用题**\n';
  b.general.forEach((q, i) => { out += (i + 1) + '. ' + q + '\n   思路：简短自我介绍（30秒），突出与岗位相关的1-2个点。\n'; });
  out += '\n**二、专业题**\n';
  b.pro.forEach((q, i) => { out += (i + 1) + '. ' + q + '\n   思路：先答概念，再结合你真实做过的事举例，不会的坦诚说明并说学习路径。\n'; });
  out += '\n**三、行为题**\n';
  b.behavior.forEach((q, i) => { out += (i + 1) + '. ' + q + '\n   思路：用 STAR 结构（情境-任务-行动-结果），结果尽量带数字。\n'; });
  out += '\n想练哪一题？直接告诉我"模拟面试"，我来按这个岗位逐题问你。' + ETHICS_FOOT;
  return out;
}

// ============ 功能四：模拟面试（状态机）============
function startInterview(text, session) {
  const role = extractRole(text);
  const bank = pickBank(role);
  const qs = [...bank.general.slice(0, 1), ...bank.pro.slice(0, 2), ...bank.behavior.slice(0, 1)];
  session.mode = 'interview';
  session.role = role;
  session.questions = qs;
  session.idx = 0;
  session.answers = [];
  return '好，开始「' + role + '」模拟面试，我会逐题提问，你作答后我给点评。共 ' + qs.length + ' 题。\n\n' +
    '**第 1 题**：' + qs[0] + '\n\n（直接回复你的答案；输入"退出"结束面试）' + ETHICS_FOOT;
}

function commentAnswer(ans, question) {
  const len = ans.length;
  const hasNum = /\d/.test(ans);
  const hasStar = /当时|情境|任务|我负责|结果|最后/.test(ans);
  const points = [];
  points.push('**逻辑**：' + (len > 60 ? '回答较完整，有展开。' : '回答偏短，建议按"背景-做法-结果"展开，至少说清 3 点。'));
  points.push('**具体性**：' + (hasNum ? '有数字，很好，这让回答可信。' : '缺具体数字或实例，试着补一个真实的数据或细节。'));
  points.push('**表达**：' + (hasStar ? '用了"我负责/结果"这类表述，突出了个人贡献。' : '多用"我"开头的句子，明确你自己的动作和结果。'));
  const score = Math.min(100, 40 + (len > 60 ? 20 : 5) + (hasNum ? 20 : 0) + (hasStar ? 20 : 0));
  let out = '**本题点评**（' + score + '/100）\n' + points.map(p => '- ' + p).join('\n');
  out += '\n\n**参考方向**：' + question + ' 这类题，关键是展示你的真实经历和思考，不要背模板。';
  return out;
}

function answerInterview(text, session) {
  const q = session.questions[session.idx];
  session.answers.push({ q, a: text });
  let out = commentAnswer(text, q) + '\n\n';
  session.idx += 1;
  if (session.idx >= session.questions.length) {
    session.mode = null;
    const avg = Math.round(session.answers.length * 72 / session.answers.length);
    out += '**面试结束**，共完成 ' + session.answers.length + ' 题。\n';
    out += '整体建议：把每题的回答都按 STAR 结构重写一遍，并给关键结果补上真实数字，面试表现会更稳。\n';
    out += '要再来一轮吗？说"模拟面试"即可。' + ETHICS_FOOT;
    return out;
  }
  out += '**第 ' + (session.idx + 1) + ' 题**：' + session.questions[session.idx] + '\n\n（继续作答，或输入"退出"结束）' + ETHICS_FOOT;
  return out;
}

// ============ 功能五：求职提示 ============
function jobTips(text) {
  const t = text;
  let out = '针对你的问题，给你几点实在的提示：\n\n';
  if (/投递|简历投|海投/.test(t)) {
    out += '**关于投递**：\n' +
      '- 一份简历投一个岗位方向，别用同一份海投所有岗位；\n' +
      '- 邮件标题写清"应聘岗位-姓名-学校"，正文简短说明匹配点；\n' +
      '- 投前核对联系方式，别让 HR 联系不到你。\n\n';
  }
  if (/选岗|岗位|方向|怎么找/.test(t)) {
    out += '**关于选岗**：\n' +
      '- 大专生优先看"能力匹配"而非"学历门槛"，技能岗更看实操；\n' +
      '- 看清 JD 里的硬技能要求，对照补 1-2 项再投；\n' +
      '- 警惕"培训机构式招聘"：先收费、押证件、无薪试岗都要避开。\n\n';
  }
  if (/避坑|坑|骗|靠谱/.test(t)) {
    out += '**关于避坑**：\n' +
      '- 任何要求先交钱、押身份证、贷培训费的，直接拒绝；\n' +
      '- 薪资明显高于市场又要你"先培训"的，多半有问题；\n' +
      '- 面试问清试用期、社保、工作内容，敢含糊其辞的要多留心。\n\n';
  }
  if (/面试/.test(t)) {
    out += '**关于面试**：\n' +
      '- 提前查公司业务，准备 1 个和岗位相关的真实项目讲清楚；\n' +
      '- 遇到不会的题，说"我没做过，但我会这样学"，比硬编强；\n' +
      '- 准备 2-3 个反问问题，显得你有思考。\n\n';
  }
  if (out.indexOf('关于') === -1) {
    out += '**通用求职要点**：\n' +
      '- 简历按岗位定制，突出匹配的 2-3 段真实经历；\n' +
      '- 每段经历带数字，表达用强动词；\n' +
      '- 投递要精准，面试要准备，遇到收费/押证立刻走。\n\n';
  }
  out += '你现在是投哪个方向？告诉我，我帮你列更针对性的注意事项。' + ETHICS_FOOT;
  return out;
}

// ============ 未知意图 ============
function unknownReply() {
  return '我可以帮你做五件事，你选一个，或直接把内容发给我：\n\n' +
    '1. **简历诊断** —— 粘贴简历，我按四个维度找问题\n' +
    '2. **简历润色** —— 发一段经历，我帮你优化表达\n' +
    '3. **模拟面试** —— 说岗位，我逐题问你并点评\n' +
    '4. **面试题库** —— 说岗位，我按三类出题\n' +
    '5. **求职提示** —— 问投递/选岗/避坑要点\n\n' +
    '另外提醒：我仅作求职辅助，不会替你编造经历。' + ETHICS_FOOT;
}

// ============ 主入口 ============
function reply(userText, session) {
  const text = (userText || '').trim();
  session = session || {};
  if (!text) return unknownReply();
  if (/^(你好|hi|hello|在吗|嗨)$/i.test(text)) return OPENING;

  const guard = ethicsGuard(text);
  if (guard) return { text: guard, intent: 'ethics' };

  const intent = detectIntent(text, session);
  let out;
  switch (intent.key) {
    case 'diagnose': out = diagnoseResume(text, session); break;
    case 'polish': out = polishResume(text, session); break;
    case 'interview': out = startInterview(text, session); break;
    case 'answer': out = answerInterview(text, session); break;
    case 'bank': out = generateBank(text); break;
    case 'tips': out = jobTips(text); break;
    case 'exit':
      session.mode = null;
      out = '好的，面试结束。想再练一次说"模拟面试"就行。' + ETHICS_FOOT;
      break;
    default: out = unknownReply();
  }
  return { text: out, intent: intent.key, intentName: intent.name };
}

if (typeof window !== 'undefined') { window.AIAgent = { reply: reply, OPENING: OPENING, ETHICS_FOOT: ETHICS_FOOT, detectIntent: detectIntent }; }
