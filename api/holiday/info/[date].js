// Translation Mappings
const WEEK_DAY_NAME_MAP = {
  '周一': 'Monday',   '周二': 'Tuesday',  '周三': 'Wednesday',
  '周四': 'Thursday',  '周五': 'Friday',   '周六': 'Saturday',
  '周日': 'Sunday',
};

const DAY_TYPE_MAP = {
  0: 'Workday',
  1: 'Weekend',
  2: 'Holiday',
  3: 'Compensatory Workday',
};

const HOLIDAY_NAME_MAP = {
  '元旦':   "New Year's Day",
  '春节':   'Spring Festival',
  '清明节': 'Qingming Festival',
  '劳动节': 'Labor Day',
  '端午节': 'Dragon Boat Festival',
  '中秋节': 'Mid-Autumn Festival',
  '国庆节': 'National Day',
  '妇女节': "Women's Day",
  '青年节': 'Youth Day',
  '儿童节': "Children's Day",
  '建军节': 'Army Day',
  '除夕':   "New Year's Eve",
};

function translateHolidayName(name) {
  if (!name) return null;
  if (HOLIDAY_NAME_MAP[name]) return HOLIDAY_NAME_MAP[name];

  const match = name.match(/^(.+?)(前|后)(调休|补班)$/);
  if (match) {
    const holidayPart = match[1];
    const position = match[2] === '前' ? 'before' : 'after';
    for (const [cn, en] of Object.entries(HOLIDAY_NAME_MAP)) {
      if (holidayPart === cn || holidayPart === cn.replace('节', '') || holidayPart + '节' === cn) {
        return `Compensatory workday ${position} ${en}`;
      }
    }
  }

  if (WEEK_DAY_NAME_MAP[name]) return WEEK_DAY_NAME_MAP[name];
  return name + ' (untranslated)';
}

function translateType(typeObj) {
  if (!typeObj) return null;
  const weekNames = {1:'Monday',2:'Tuesday',3:'Wednesday',4:'Thursday',5:'Friday',6:'Saturday',7:'Sunday'};
  return {
    type: typeObj.type,
    type_name: DAY_TYPE_MAP[typeObj.type] || `Unknown (${typeObj.type})`,
    name: translateHolidayName(typeObj.name),
    week: typeObj.week,
    week_name: weekNames[typeObj.week] || null,
  };
}

function translateHoliday(holidayObj) {
  if (!holidayObj) return null;
  const result = {
    holiday: holidayObj.holiday,
    name: translateHolidayName(holidayObj.name),
    wage: holidayObj.wage,
    wage_description: `${holidayObj.wage}x pay`,
  };
  if (holidayObj.after !== undefined) {
    result.after = holidayObj.after;
    result.after_description = holidayObj.after
      ? 'Compensatory workday after the holiday'
      : 'Compensatory workday before the holiday';
  }
  if (holidayObj.target) {
    result.target = translateHolidayName(holidayObj.target);
  }
  return result;
}

export default async function handler(req, res) {
  // Allow anyone to access (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const { date } = req.query;

  if (date && !/^\d{4}-\d{1,2}-\d{1,2}$/.test(date)) {
    return res.status(400).json({
      code: -1,
      message: 'Invalid date format. Use YYYY-MM-DD (e.g. 2024-10-01)',
    });
  }

  try {
    const url = date
      ? `https://timor.tech/api/holiday/info/${date}`
      : 'https://timor.tech/api/holiday/info';

    const response = await fetch(url, {
      headers: { 'User-Agent': 'HolidayAPI-EN/1.0' },
    });
    const originalData = await response.json();

    if (originalData.code !== 0) {
      return res.status(502).json({
        code: originalData.code,
        message: 'Upstream API returned an error',
        original: originalData,
      });
    }

    return res.status(200).json({
      code: originalData.code,
      type: translateType(originalData.type),
      holiday: translateHoliday(originalData.holiday),
    });
  } catch (err) {
    return res.status(500).json({
      code: -1,
      message: 'Internal server error: ' + err.message,
    });
  }
}
