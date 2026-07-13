# Mail Dashboard

Ek Gmail campaign dashboard: sender account dropdown se select karo, PDF upload karke usme se emails extract karo, mail bhejo, aur pata karo ki mail open hui ya nahi (open timestamp ke saath).

## Kya hai isme

- **Sender accounts** — multiple Gmail accounts add karo (email + App Password), backend me AES-256 se encrypt hoke save hote hain.
- **PDF → email extraction** — PDF upload karo, regex se saare email addresses nikal ke ek editable list dikhata hai.
- **Subject templates** — dropdown se ek preset subject choose karo (job application, resume sharing, follow-up) ya "Custom subject" select karke apna likho. Text box me hamesha edit kar sakte ho.
- **Attachment** — resume ya koi bhi file (PDF/DOC/etc) attach kar sakte ho, wahi sabko bhejе gaye mail me lagegi.
- **Bulk send** — extracted/edited list ke sabko ek saath bhejta hai.
- **Manual single send** — sirf ek email address type karke usi attachment/subject/message ke saath ek recipient ko turant bhej sakte ho, PDF list se alag.
- **Open tracking (2 signals)** — har mail me ek invisible 1x1 **tracking pixel** hota hai jo email khulte hi (agar images auto-load ho) status update kar deta hai. Lekin bahut se email clients (Outlook, Apple Mail, etc) images block kar dete hain jab tak user manually allow na kare — isliye pixel akela hamesha bharosemand nahi hota.

  Isi wajah se ek dusra, zyada reliable signal bhi hai: har mail me ek **"View resume online" link** bhi jata hai. Jab recipient us link pe click karta hai, server turant "clicked" record kar leta hai (chahe images block ho) aur resume browser me dikha/download bhi kar deta hai. Dashboard me **Pixel opened** aur **Link clicked** dono alag-alag columns me exact time ke saath dikhte hain.

## Setup

```bash
cd mail-dashboard
npm install
cp .env.example .env
```

`.env` me:
1. `ENCRYPTION_KEY` generate karo:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   output ko `ENCRYPTION_KEY=` ke aage paste kardo.
2. `BASE_URL` — apna public URL (neeche important note dekho, ye tracking ke liye zaroori hai).

Server chalao:
```bash
npm start
```
Browser me kholo: `http://localhost:3000`

## Gmail App Password kaise banaye

Gmail apna normal password SMTP ke liye allow nahi karta. Chahiye:
1. Google Account → Security → **2-Step Verification** on karo (agar off hai).
2. https://myaccount.google.com/apppasswords pe jao.
3. Ek naam do (e.g. "Mail Dashboard"), 16-character password milega.
4. Wahi password dashboard ke "Add a Gmail account" form me daalo — apna normal Gmail password nahi.

## ⚠️ Open-tracking ke liye zaroori: public URL

Tracking pixel tabhi kaam karta hai jab recipient ka email client us image ko internet se fetch kar paaye. Iska matlab:

- **`localhost` par tracking kaam nahi karega** kyunki Gmail/Outlook ke servers aapke laptop tak nahi pahunch sakte.
- Testing ke liye [ngrok](https://ngrok.com) ya [cloudflared tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) use karo, jo bhi public URL mile wahi `.env` me `BASE_URL` set karo, server restart karo.
- Production ke liye kisi bhi VPS / Render / Railway / Fly.io jaisi jagah deploy kardo aur wahi ka domain `BASE_URL` me daalo.

Ye bhi dhyan rahe — open tracking **kabhi 100% accurate nahi hota**:
- Apple Mail Privacy Protection sab images ko pehle se hi apne server se preload kar leta hai — isse "opened" dikh sakta hai chahe user ne actually na khola ho.
- Kai clients images by default block karte hain jab tak user "show images" na dabaye — isse actual opens miss ho sakte hain.
- Yaani ye ek estimate hai, guarantee nahi.

## Gmail ki bhejne ki limits

Normal Gmail account: ~500 emails/din. Google Workspace: ~2000/din. Isse zyada bhejne par Google account ko temporarily block kar sakta hai — bulk/cold outreach karte waqt is limit ka dhyan rakhein.

## Zaroori: consent aur spam laws

Jinko mail bhej rahe ho unki permission/relationship honi chahiye (existing customers, opted-in list, etc). Random PDF se nikale gaye addresses ko bina consent ke bulk mail karna India ke IT Act, ya CAN-SPAM/GDPR jaise laws ke against ja sakta hai, aur Gmail apna account bhi suspend kar sakta hai spam complaints par. Har mail me ek unsubscribe/opt-out ka rasta dena best practice hai.

## Project structure

```
mail-dashboard/
  server.js              → Express app entry point
  src/
    db.js                → JSON-file datastore (data/db.json)
    crypto.js             → AES encrypt/decrypt for app passwords
    routes/
      accounts.js         → add/list/delete Gmail sender accounts
      upload.js            → PDF upload + email extraction
      send.js               → sends mail + embeds tracking pixel
      track.js               → serves tracking pixel, marks "opened"
      emails.js               → lists sent emails + their status for the table
  public/
    index.html, style.css, app.js  → the dashboard UI
  data/
    db.json              → auto-created on first run (accounts + sent-email log)
```

## Data ka backup

`data/db.json` me sab kuch (encrypted passwords included) stored hai. Isse git me commit mat karo — `.gitignore` me `data/` already excluded hai.
