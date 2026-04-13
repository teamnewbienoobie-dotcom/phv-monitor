#!/usr/bin/env python3
import subprocess
import json
import urllib.request
import re
import datetime

LINE_TOKEN = "T/0xAwKyoluomYq9ICbDFAKXEedmowtf+1u0DE06AHGgHKJgI8A/cUHuvIllKidu/3Dbx9a+LXZIbouFsosjrxW9bZtTT6cGjDbr/lEtmZPbpf3PZ8R3u8D7h8DCwJh7RhFpebEMEZo1xPeYjesMzQdB04t89/1O/w1cDnyilFU="
LINE_USER = "U719c000741b49833a0ecca36d1be3659"
GWS = "/usr/local/bin/gws"

def gws(args):
    result = subprocess.run([GWS] + args, capture_output=True, text=True)
    try:
        return json.loads(result.stdout)
    except Exception:
        return {}

def send_line(text):
    data = json.dumps({
        "to": LINE_USER,
        "messages": [{"type": "text", "text": text}]
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.line.me/v2/bot/message/push",
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {LINE_TOKEN}"
        }
    )
    with urllib.request.urlopen(req) as r:
        return r.read()

def main():
    tz = datetime.timezone(datetime.timedelta(hours=8))
    now = datetime.datetime.now(tz)
    today = now.strftime("%Y-%m-%d")
    yesterday = (now - datetime.timedelta(days=1)).strftime("%Y/%m/%d")
    today_slash = now.strftime("%Y/%m/%d")
    today_display = now.strftime("%Y 年 %-m 月 %-d 日")

    # ===== Gmail =====
    gmail_data = gws(["gmail", "users", "messages", "list", "--params",
        json.dumps({"userId": "me", "q": f"after:{yesterday} before:{today_slash}", "maxResults": 15})])

    inbox_items = []
    for msg in gmail_data.get("messages", [])[:10]:
        meta = gws(["gmail", "users", "messages", "get", "--params",
            json.dumps({"userId": "me", "id": msg["id"], "format": "metadata",
                        "metadataHeaders": ["From", "Subject"]})])
        labels = meta.get("labelIds", [])
        if "UNREAD" in labels and "INBOX" in labels:
            headers = {h["name"]: h["value"] for h in meta.get("payload", {}).get("headers", [])}
            from_raw = headers.get("From", "")
            m = re.match(r'^"?([^"<]+)"?\s*<', from_raw)
            sender = m.group(1).strip() if m else from_raw[:25]
            subject = headers.get("Subject", "（無主旨）")[:40]
            inbox_items.append(f"• {sender}：{subject}")

    gmail_section = "📬 昨日信件回顧\n" + ("\n".join(inbox_items) if inbox_items else "昨日無重要信件")

    # ===== Calendar =====
    cal_data = gws(["calendar", "events", "list", "--params",
        json.dumps({
            "calendarId": "team.newbienoobie@gmail.com",
            "timeMin": f"{today}T00:00:00+08:00",
            "timeMax": f"{today}T23:59:59+08:00",
            "singleEvents": True,
            "orderBy": "startTime"
        })])

    cal_items = []
    for e in cal_data.get("items", []):
        t = e.get("start", {}).get("dateTime", "")
        if t:
            dt = datetime.datetime.fromisoformat(t)
            time_str = dt.strftime("%-H:%M")
        else:
            time_str = "全天"
        title = e.get("summary", "（無標題）")
        loc = e.get("location", "")
        cal_items.append(f"• {time_str} — {title}" + (f" ({loc})" if loc else ""))

    cal_section = "📅 今日行程\n" + ("\n".join(cal_items) if cal_items else "今日無排程")

    # ===== 發送 =====
    message = f"☀️ 早晨日報｜{today_display}\n\n{gmail_section}\n\n{cal_section}"
    send_line(message)
    print(f"日報已發送：{today}")

if __name__ == "__main__":
    main()
