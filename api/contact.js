// 문의 접수: 슈파베이스에 저장 → 리센드로 알림 메일
// 슈파베이스 publishable 키는 공개용 키라 코드에 둬도 됨 (표는 잠겨 있고 submit_inquiry 함수만 열림)
const SUPABASE_URL = 'https://shmhtbdfqxwojurqalub.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iD24FfsDbypP3uJBuO-S7g_nTsc3R9G';
const NOTIFY_TO = 'taesunghyuk@gmail.com';

const ERRORS = {
  NAME_REQUIRED: '이름을 적어 주세요.',
  PHONE_REQUIRED: '연락처를 적어 주세요.',
  TOO_LONG: '글자 수가 너무 많아요. 조금 줄여 주세요.',
  DAILY_LIMIT: '오늘 접수가 많아 마감되었어요. 전화로 문의해 주세요.',
};
const FIELDS = ['name', 'org', 'phone', 'email', 'headcount', 'schedule', 'message'];
const LABELS = { name: '이름', org: '회사·기관명', phone: '연락처', email: '이메일', headcount: '희망 인원', schedule: '희망 일정', message: '문의 내용' };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 받아요.' });
  const b = req.body || {};

  // 자동 등록(봇) 차단: 숨은 칸이 채워졌거나, 페이지를 연 지 3초도 안 돼 보냈으면 조용히 무시
  if (b.website || Number(b.elapsed) < 3000) return res.status(200).json({ ok: true });

  const p = {};
  for (const f of FIELDS) p[f] = typeof b[f] === 'string' ? b[f] : '';

  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_inquiry`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    return res.status(400).json({ error: ERRORS[e.message] || '접수에 실패했어요. 전화로 문의해 주세요.' });
  }

  // 메일은 실패해도 문의는 이미 저장됐으니 성공으로 응답
  try {
    const rows = FIELDS.map((f) => `<tr><th align="left" style="padding:4px 12px 4px 0">${LABELS[f]}</th><td>${esc(p[f]).replace(/\n/g, '<br>')}</td></tr>`).join('');
    const m = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: '홈페이지 문의 <onboarding@resend.dev>',
        to: [NOTIFY_TO],
        subject: `[홈페이지 문의] ${p.name.trim().slice(0, 30)}님`,
        html: `<h2>새 상담 신청이 들어왔어요</h2><table>${rows}</table>`,
      }),
    });
    if (!m.ok) console.error('resend', m.status, await m.text());
  } catch (e) {
    console.error('resend', e);
  }
  return res.status(200).json({ ok: true });
};
