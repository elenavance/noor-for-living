from django.conf import settings
from datetime import timedelta

from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_POST

from .models import AppRating, DailyWorshipLog, QuranBookmark, QuranReadingProgress
from .ai_learning import LearningServiceError, ask_noor
from django.core.cache import cache
import os


# Canonical Quran verse counts by surah, used to reject impossible references.
SURAH_AYAH_COUNTS = (
    7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128,
    111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30,
    73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45,
    60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52,
    52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17,
    19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4,
    7, 3, 6, 3, 5, 4, 5, 6,
)


def valid_quran_reference(surah_number, ayah_number):
    return (
        1 <= surah_number <= len(SURAH_AYAH_COUNTS)
        and 1 <= ayah_number <= SURAH_AYAH_COUNTS[surah_number - 1]
    )


def home(request):
    return render(request, "home.html")


@require_POST
def submit_app_rating(request):
    try:
        rating = int(request.POST.get("rating", ""))
    except (TypeError, ValueError):
        return redirect("/?rated=0#rate-noor")
    if rating < 1 or rating > 5:
        return redirect("/?rated=0#rate-noor")
    feedback = request.POST.get("feedback", "").strip()[:1000]
    AppRating.objects.create(user=request.user if request.user.is_authenticated else None, rating=rating, feedback=feedback)
    return redirect("/?rated=1#rate-noor")


def manifest(request):
    manifest_data = {"id": "/", "name": "NOOR FOR LIVING", "short_name": "Noor", "description": "Your Daily Islamic Companion", "start_url": "/", "scope": "/", "display": "standalone", "background_color": "#f8f5ed", "theme_color": "#123c32", "lang": "en", "icons": []}
    return JsonResponse(manifest_data, content_type="application/manifest+json")


def service_worker(request):
    worker_path = settings.BASE_DIR / "static" / "js" / "service-worker.js"
    if not worker_path.exists():
        return HttpResponse("// Service worker is not installed yet.", content_type="application/javascript")
    response = HttpResponse(worker_path.read_text(encoding="utf-8"), content_type="application/javascript")
    response["Service-Worker-Allowed"] = "/"
    response["Cache-Control"] = "no-cache"
    return response


def prayer_times(request):
    return render(request, "worship/prayer_times.html")


def qibla(request):
    return render(request, "worship/qibla.html")


def islamic_calendar(request):
    return render(request, "calendar.html")



def daily_remembrance(request):
    remembrances = [
        {"id":"rabbana-atina","category":"Guidance","kind":"dua","title":"Good in this life and the next","arabic":"رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ","transliteration":"Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina adhaban-nar.","translation":"Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.","translation_id":"Ya Tuhan kami, berikanlah kepada kami kebaikan di dunia dan kebaikan di akhirat, dan lindungilah kami dari azab neraka.","source":"Quran 2:201","note":"A comprehensive supplication asking for good in both lives."},
        {"id":"rabbi-zidni","category":"Learning","kind":"dua","title":"Ask for beneficial knowledge","arabic":"رَبِّ زِدْنِي عِلْمًا","transliteration":"Rabbi zidni ilma.","translation":"My Lord, increase me in knowledge.","translation_id":"Ya Tuhanku, tambahkanlah ilmu kepadaku.","source":"Quran 20:114","note":"A short supplication when seeking knowledge."},
        {"id":"rabbi-shrah","category":"Guidance","kind":"dua","title":"Ease and clarity","arabic":"رَبِّ اشْرَحْ لِي صَدْرِي ۝ وَيَسِّرْ لِي أَمْرِي ۝ وَاحْلُلْ عُقْدَةً مِنْ لِسَانِي ۝ يَفْقَهُوا قَوْلِي","transliteration":"Rabbishrah li sadri, wa yassir li amri, wahlul uqdatan min lisani, yafqahu qawli.","translation":"My Lord, expand for me my chest, ease for me my task, and untie the knot from my tongue so that they may understand my speech.","translation_id":"Ya Tuhanku, lapangkanlah dadaku, mudahkanlah urusanku, dan lepaskanlah kekakuan dari lidahku agar mereka mengerti perkataanku.","source":"Quran 20:25–28","note":"The supplication of Prophet Musa when preparing to speak."},
        {"id":"la-tuzigh","category":"Steadfastness","kind":"dua","title":"Keep the heart steadfast","arabic":"رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِنْ لَدُنْكَ رَحْمَةً إِنَّكَ أَنْتَ الْوَهَّابُ","transliteration":"Rabbana la tuzigh qulubana bada idh hadaytana wa hab lana min ladunka rahmah, innaka antal-Wahhab.","translation":"Our Lord, let not our hearts deviate after You have guided us and grant us from Yourself mercy. Indeed, You are the Bestower.","translation_id":"Ya Tuhan kami, janganlah Engkau condongkan hati kami kepada kesesatan setelah Engkau beri petunjuk, dan karuniakanlah rahmat kepada kami dari sisi-Mu. Sesungguhnya Engkau Maha Pemberi.","source":"Quran 3:8","note":"A supplication for guidance and steadfastness."},
        {"id":"parents","category":"Family","kind":"dua","title":"Pray for your parents and the believers","arabic":"رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ","transliteration":"Rabbanaghfir li wa liwalidayya wa lil-mu'minina yawma yaqumul-hisab.","translation":"Our Lord, forgive me, my parents, and the believers on the Day the account is established.","translation_id":"Ya Tuhan kami, ampunilah aku, kedua orang tuaku, dan orang-orang mukmin pada hari terjadinya perhitungan.","source":"Quran 14:41","note":"A prayer for forgiveness for oneself, one's parents, and the believers."},
        {"id":"hasbunallah","category":"Trust","kind":"dua","title":"Place your trust in Allah","arabic":"حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ","transliteration":"Hasbunallahu wa ni'mal-wakil.","translation":"Sufficient for us is Allah, and He is the best Disposer of affairs.","translation_id":"Cukuplah Allah bagi kami, dan Dia sebaik-baik penolong.","source":"Quran 3:173","note":"A declaration of reliance upon Allah."},
        {"id":"ayat-kursi","category":"Before Sleeping","kind":"dua","title":"Ayat al-Kursi — protection through the night","arabic":"اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ","transliteration":"Allahu la ilaha illa Huwal-Hayyul-Qayyum. La ta'khudhuhu sinatun wa la nawm. Lahu ma fis-samawati wa ma fil-ard. Man dhal-ladhi yashfa'u 'indahu illa bi'idhnih. Ya'lamu ma bayna aydihim wa ma khalfahum, wa la yuhituna bishay'im-min 'ilmihi illa bima sha'. Wasi'a kursiyyuhus-samawati wal-ard, wa la ya'uduhu hifzhuhuma, wa Huwal-'Aliyyul-'Azhim.","translation":"Allah — there is no god worthy of worship except Him, the Ever-Living, the Sustainer of all. Neither drowsiness nor sleep overtakes Him. To Him belongs whatever is in the heavens and whatever is on the earth. Who can intercede with Him except by His permission? He knows what is before them and what is behind them, and they grasp nothing of His knowledge except what He wills. His Kursi extends over the heavens and the earth, and preserving them does not tire Him. He is the Most High, the Most Great.","translation_id":"Allah, tidak ada tuhan selain Dia, Yang Maha Hidup, terus-menerus mengurus makhluk-Nya. Dia tidak mengantuk dan tidak tidur. Milik-Nya apa yang ada di langit dan di bumi. Tidak ada yang dapat memberi syafaat di sisi-Nya tanpa izin-Nya. Dia mengetahui apa yang di hadapan mereka dan di belakang mereka, dan mereka tidak mengetahui apa-apa dari ilmu-Nya melainkan apa yang Dia kehendaki. Kursi-Nya meliputi langit dan bumi, dan Dia tidak merasa berat memelihara keduanya. Dialah Yang Maha Tinggi, Maha Agung.","source":"Quran 2:255 · Sahih al-Bukhari 2311","note":"Whoever recites it before sleeping is protected through the night, as narrated in Bukhari."},
        {"id":"sleeping","category":"Before Sleeping","kind":"dua","title":"In Your name I die and I live","arabic":"بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا","transliteration":"Bismika Allahumma amutu wa ahya.","translation":"In Your name, O Allah, I die and I live.","translation_id":"Dengan nama-Mu ya Allah, aku mati dan aku hidup.","source":"Sahih al-Bukhari 6324","note":"Said when lying down to sleep."},
        {"id":"waking","category":"After Waking","kind":"dua","title":"Gratitude for a new morning","arabic":"الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ","transliteration":"Alhamdu lillahil-ladhi ahyana ba'da ma amatana wa ilayhin-nushur.","translation":"All praise is for Allah who gave us life after death, and to Him is the resurrection.","translation_id":"Segala puji bagi Allah yang telah menghidupkan kami setelah mematikan kami, dan kepada-Nya kami dibangkitkan.","source":"Sahih al-Bukhari 6324","note":"Said upon waking up."},
        {"id":"morning","category":"Morning & Evening","kind":"dhikr","title":"Morning remembrance","arabic":"أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ","transliteration":"Asbahna wa asbahal-mulku lillah, walhamdu lillah, la ilaha illallahu wahdahu la sharika lah.","translation":"We have entered the morning and the whole kingdom belongs to Allah. All praise is for Allah. None has the right to be worshipped except Allah, alone, without partner.","translation_id":"Kami telah memasuki waktu pagi dan kerajaan hanya milik Allah. Segala puji bagi Allah. Tidak ada tuhan yang berhak disembah selain Allah Yang Maha Esa, tiada sekutu bagi-Nya.","source":"Sahih Muslim 2723","note":"Recited in the morning."},
        {"id":"evening","category":"Morning & Evening","kind":"dhikr","title":"Evening remembrance","arabic":"أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ","transliteration":"Amsayna wa amsal-mulku lillah, walhamdu lillah, la ilaha illallahu wahdahu la sharika lah.","translation":"We have entered the evening and the whole kingdom belongs to Allah. All praise is for Allah. None has the right to be worshipped except Allah, alone, without partner.","translation_id":"Kami telah memasuki waktu petang dan kerajaan hanya milik Allah. Segala puji bagi Allah. Tidak ada tuhan yang berhak disembah selain Allah Yang Maha Esa, tiada sekutu bagi-Nya.","source":"Sahih Muslim 2723","note":"Recited in the evening."},
        {"id":"sayyid-istighfar","category":"Morning & Evening","kind":"dua","title":"Sayyid al-Istighfar — the master supplication for forgiveness","arabic":"اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ","transliteration":"Allahumma anta rabbi la ilaha illa ant, khalaqtani wa ana 'abduk, wa ana 'ala 'ahdika wa wa'dika mastata't, a'udhu bika min sharri ma sana't, abu'u laka bini'matika 'alayya, wa abu'u bidhanbi faghfir li, fa innahu la yaghfirudh-dhunuba illa ant.","translation":"O Allah, You are my Lord; there is no god worthy of worship except You. You created me and I am Your servant, and I uphold Your covenant and promise as much as I can. I seek refuge in You from the evil of what I have done. I acknowledge Your blessing upon me and I acknowledge my sin, so forgive me, for none forgives sins except You.","translation_id":"Ya Allah, Engkau adalah Tuhanku, tidak ada tuhan yang berhak disembah selain Engkau. Engkau menciptakanku dan aku adalah hamba-Mu, dan aku berada di atas perjanjian dan janji-Mu semampuku. Aku berlindung kepada-Mu dari keburukan yang kuperbuat. Kuakui nikmat-Mu kepadaku dan kuakui dosaku, maka ampunilah aku, karena tidak ada yang dapat mengampuni dosa kecuali Engkau.","source":"Sahih al-Bukhari 6306","note":"Whoever says it with conviction in the morning or evening and dies that day or night enters Paradise."},
        {"id":"before-eating","category":"Eating","kind":"dhikr","title":"Before eating","arabic":"بِسْمِ اللَّهِ","transliteration":"Bismillah.","translation":"In the name of Allah.","translation_id":"Dengan nama Allah.","source":"Sahih al-Bukhari 5376","note":"If forgotten at the start, say: Bismillahi awwalahu wa akhirahu (Abu Dawud 3767)."},
        {"id":"after-eating","category":"Eating","kind":"dua","title":"After eating","arabic":"الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ","transliteration":"Alhamdu lillahil-ladhi ath'amana wa saqana wa ja'alana muslimin.","translation":"All praise is for Allah who fed us, gave us drink, and made us Muslims.","translation_id":"Segala puji bagi Allah yang telah memberi kami makan dan minum serta menjadikan kami kaum muslimin.","source":"Sunan Abi Dawud 3850 · Jami' at-Tirmidhi 3457","note":"Said after finishing a meal."},
        {"id":"leaving-home","category":"Leaving Home","kind":"dua","title":"Leaving the house","arabic":"بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ","transliteration":"Bismillah, tawakkaltu 'alallah, wa la hawla wa la quwwata illa billah.","translation":"In the name of Allah, I place my trust in Allah, and there is no power and no strength except with Allah.","translation_id":"Dengan nama Allah, aku bertawakal kepada Allah, dan tidak ada daya dan kekuatan kecuali dengan pertolongan Allah.","source":"Sunan Abi Dawud 5095 · Jami' at-Tirmidhi 3426","note":"Whoever says it is guided, sufficed, and protected."},
        {"id":"entering-home","category":"Leaving Home","kind":"dua","title":"Entering the house","arabic":"بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى رَبِّنَا تَوَكَّلْنَا","transliteration":"Bismillahi walajna, wa bismillahi kharajna, wa 'ala rabbina tawakkalna.","translation":"In the name of Allah we enter, in the name of Allah we leave, and upon our Lord we rely.","translation_id":"Dengan nama Allah kami masuk, dengan nama Allah kami keluar, dan kepada Tuhan kami kami bertawakal.","source":"Sunan Abi Dawud 5096","note":"Said when entering one's home."},
        {"id":"travel","category":"Travelling","kind":"dua","title":"Setting out on a journey","arabic":"سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ","transliteration":"Subhanal-ladhi sakhkhara lana hadha wa ma kunna lahu muqrinin, wa inna ila rabbina lamunqalibun.","translation":"Glory be to Him who subjected this to us, though we could never have accomplished it ourselves, and indeed to our Lord we will return.","translation_id":"Mahasuci Dzat yang telah menundukkan ini bagi kami, padahal kami tidak mampu menguasainya, dan sesungguhnya kami akan kembali kepada Tuhan kami.","source":"Quran 43:13–14 · Sahih Muslim 1342","note":"Recited when boarding a vehicle or mount for travel."},
        {"id":"protection","category":"Protection","kind":"dua","title":"Refuge in the perfect words of Allah","arabic":"أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ","transliteration":"A'udhu bikalimatillahit-tammati min sharri ma khalaq.","translation":"I seek refuge in the perfect words of Allah from the evil of what He has created.","translation_id":"Aku berlindung dengan kalimat-kalimat Allah yang sempurna dari keburukan makhluk yang Dia ciptakan.","source":"Sahih Muslim 2708","note":"Said in the evening; nothing will harm the one who says it."},
        {"id":"yunus","category":"Protection","kind":"dua","title":"The supplication of Prophet Yunus","arabic":"لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ","transliteration":"La ilaha illa anta, subhanaka, inni kuntu minazh-zhalimin.","translation":"There is no god except You; glory be to You. Indeed, I have been among the wrongdoers.","translation_id":"Tidak ada tuhan selain Engkau, Mahasuci Engkau, sesungguhnya aku termasuk orang-orang yang zalim.","source":"Quran 21:87 · Jami' at-Tirmidhi 3505","note":"A supplication for distress; no Muslim calls upon Allah with it without being answered."},
        {"id":"subhanallah","category":"Remembrance","kind":"dhikr","title":"Glory and praise","arabic":"سُبْحَانَ اللَّهِ وَبِحَمْدِهِ","transliteration":"SubhanAllahi wa bihamdihi.","translation":"Glory be to Allah and praise be to Him.","translation_id":"Mahasuci Allah dan dengan memuji-Nya.","source":"Sahih al-Bukhari 6405","note":"A well-known phrase of remembrance."},
        {"id":"istighfar","category":"Forgiveness","kind":"dhikr","title":"Seek forgiveness","arabic":"أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ","transliteration":"Astaghfirullaha wa atubu ilayh.","translation":"I seek forgiveness from Allah and repent to Him.","translation_id":"Aku memohon ampun kepada Allah dan bertaubat kepada-Nya.","source":"Sahih al-Bukhari 6307","note":"A phrase of seeking forgiveness and repentance."},
        {"id":"hawqala","category":"Trust","kind":"dhikr","title":"Strength comes through Allah","arabic":"لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ","transliteration":"La hawla wa la quwwata illa billah.","translation":"There is no power and no strength except through Allah.","translation_id":"Tidak ada daya dan kekuatan kecuali dengan pertolongan Allah.","source":"Sahih al-Bukhari 6384","note":"A phrase acknowledging dependence upon Allah."},
    ]
    categories = sorted({item["category"] for item in remembrances})
    return render(request, "worship/daily_remembrance.html", {"remembrances": remembrances, "categories": categories})



@login_required
def worship_tracker(request):
    today = timezone.localdate()
    log, _ = DailyWorshipLog.objects.get_or_create(user=request.user, date=today)
    if request.method == "POST":
        fields = ("fajr", "dhuhr", "asr", "maghrib", "isha", "quran_reading", "dhikr", "gratitude")
        for field in fields:
            setattr(log, field, field in request.POST)
        log.reflection = request.POST.get("reflection", "").strip()[:500]
        log.save()
        return redirect("worship_tracker")

    week_start = today - timedelta(days=6)
    saved_logs = {
        item.date: item
        for item in DailyWorshipLog.objects.filter(user=request.user, date__gte=week_start, date__lte=today)
    }
    week = []
    for offset in range(6, -1, -1):
        day = today - timedelta(days=offset)
        day_log = saved_logs.get(day)
        week.append({
            "date": day,
            "label": day.strftime("%a"),
            "completed": day_log.completed_count if day_log else 0,
            "percent": day_log.progress_percent if day_log else 0,
            "is_today": day == today,
        })
    completed_total = sum(day["completed"] for day in week)
    week_percent = round(completed_total / 56 * 100)
    streak = 0
    check_day = today
    if not saved_logs.get(today) or saved_logs[today].completed_count == 0:
        check_day = today - timedelta(days=1)
    while check_day in saved_logs and saved_logs[check_day].completed_count > 0:
        streak += 1
        check_day -= timedelta(days=1)

    return render(request, "worship/tracker.html", {
        "log": log,
        "today": today,
        "week": week,
        "week_percent": week_percent,
        "streak": streak,
        "completed_total": completed_total,
        "activity_fields": (
            ("fajr", "Fajr", "Dawn prayer"),
            ("dhuhr", "Dhuhr", "Midday prayer"),
            ("asr", "Asr", "Afternoon prayer"),
            ("maghrib", "Maghrib", "Sunset prayer"),
            ("isha", "Isha", "Night prayer"),
            ("quran_reading", "Quran reading", "Read or reflect on the Quran"),
            ("dhikr", "Dhikr", "Make time for remembrance"),
            ("gratitude", "Gratitude", "Name something you are grateful for"),
        ),
    })



@login_required
def ask_noor_view(request):
    context = {"assistant_enabled": bool(os.getenv("OPENAI_API_KEY", "").strip())}
    if request.method == "POST":
        question = request.POST.get("question", "").strip()
        context["question"] = question[:1200]
        if not question:
            context["error"] = "Please enter a question first."
        elif len(question) > 1200:
            context["error"] = "Please keep your question under 1,200 characters."
        else:
            # Limit API spending to five questions per account per minute.
            cache_key = f"ask-noor-rate:{request.user.pk}"
            if not cache.add(cache_key, 1, timeout=60):
                try:
                    count = cache.incr(cache_key)
                except ValueError:
                    cache.set(cache_key, 2, timeout=60)
                    count = 2
            else:
                count = 1
            if count > 5:
                context["error"] = "You've asked several questions recently. Please wait a minute before asking again."
            else:
                try:
                    context["result"] = ask_noor(question)
                except LearningServiceError as exc:
                    context["error"] = str(exc)
    return render(request, "learning/ask_noor.html", context)


def quran_reader(request):
    bookmarks = set()
    reading_progress = None
    if request.user.is_authenticated:
        bookmarks = set(request.user.quran_bookmarks.values_list("surah_number", "ayah_number"))
        reading_progress = QuranReadingProgress.objects.filter(user=request.user).first()
    return render(request, "quran/reader.html", {
        "saved_bookmarks": [f"{surah}:{ayah}" for surah, ayah in bookmarks],
        "reading_progress": reading_progress,
    })


def mushaf(request):
    return render(request, "quran/mushaf.html")


@login_required
@require_POST
def save_quran_progress(request):
    try:
        surah_number = int(request.POST.get("surah_number", ""))
        ayah_number = int(request.POST.get("ayah_number", ""))
    except (TypeError, ValueError):
        return JsonResponse({"ok": False, "error": "Invalid verse reference."}, status=400)

    if not valid_quran_reference(surah_number, ayah_number):
        return JsonResponse({"ok": False, "error": "That verse does not exist in the selected surah."}, status=400)

    surah_name = request.POST.get("surah_name", "").strip()[:120]
    progress, _ = QuranReadingProgress.objects.get_or_create(
        user=request.user,
        defaults={
            "surah_number": surah_number,
            "ayah_number": ayah_number,
            "surah_name": surah_name,
        },
    )
    progress.surah_number = surah_number
    progress.ayah_number = ayah_number
    progress.surah_name = surah_name
    progress.save(update_fields=["surah_number", "ayah_number", "surah_name", "updated_at"])

    # Reading the Quran also completes today's Quran-reading intention in the tracker.
    daily_log, _ = DailyWorshipLog.objects.get_or_create(
        user=request.user,
        date=timezone.localdate(),
    )
    if not daily_log.quran_reading:
        daily_log.quran_reading = True
        daily_log.save(update_fields=["quran_reading", "updated_at"])

    return JsonResponse({
        "ok": True,
        "surah_number": progress.surah_number,
        "ayah_number": progress.ayah_number,
        "surah_name": progress.surah_name,
    })


@login_required
def my_bookmarks(request):
    return render(request, "quran/bookmarks.html", {"bookmarks": request.user.quran_bookmarks.all()})


@login_required
@require_POST
def toggle_bookmark(request):
    try:
        surah_number = int(request.POST.get("surah_number", ""))
        ayah_number = int(request.POST.get("ayah_number", ""))
    except (TypeError, ValueError):
        return JsonResponse({"ok": False, "error": "Invalid verse reference."}, status=400)
    if not valid_quran_reference(surah_number, ayah_number):
        return JsonResponse({"ok": False, "error": "That verse does not exist in the selected surah."}, status=400)
    surah_name = request.POST.get("surah_name", "").strip()[:120]
    arabic_text = request.POST.get("arabic_text", "").strip()
    translation_text = request.POST.get("translation_text", "").strip()
    if not surah_name or not arabic_text:
        return JsonResponse({"ok": False, "error": "Verse text is missing. Please reload the reader."}, status=400)
    bookmark, created = QuranBookmark.objects.get_or_create(
        user=request.user, surah_number=surah_number, ayah_number=ayah_number,
        defaults={"surah_name": surah_name, "arabic_text": arabic_text, "translation_text": translation_text},
    )
    if not created:
        bookmark.delete()
        return JsonResponse({"ok": True, "saved": False})
    return JsonResponse({"ok": True, "saved": True})


@login_required
@require_POST
def delete_bookmark(request, bookmark_id):
    bookmark = get_object_or_404(QuranBookmark, id=bookmark_id, user=request.user)
    bookmark.delete()
    return redirect("my_bookmarks")
