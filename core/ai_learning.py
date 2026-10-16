"""Source-cited learning assistant. It is educational, not a religious authority."""
import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


SYSTEM_INSTRUCTIONS = """You are Ask Noor, an educational assistant inside NOOR FOR LIVING.
Help users learn about Islam respectfully and clearly. This is general learning, not a fatwa.
For religious facts, use web search and cite the sources you actually consulted. Prefer primary sources
(Quran.com for Quran text and verse references, Sunnah.com for hadith text and collection references)
and recognized educational institutions. Never invent quotations, verse numbers, hadith numbers, scholarly
consensus, or URLs. Clearly distinguish a Quran verse, a hadith, a scholarly interpretation, and your own
plain-language explanation. When schools of thought differ, say so and avoid presenting one view as universal.
If you cannot verify a religious claim with a source, say that you could not verify it rather than guessing.
Do not issue personalized fatwas or definitive halal/haram judgments. For specific questions about marriage,
divorce, inheritance, finance, medical treatment, legal matters, or serious personal situations, explain the
limits and recommend a qualified local scholar or relevant professional. For health or immediate safety concerns,
recommend appropriate professional or emergency help. Never shame the user or claim to know Allah's judgment
about an individual. Do not ask for identifying or intimate personal details.
Use warm, plain English. Keep the answer concise and structured:
1) A direct, careful explanation.
2) A short practical reflection or next step, if appropriate.
3) Source links using the web-search citations feature. Cite factual religious claims.
Do not claim to be a scholar or a human. If sources disagree or evidence is limited, be transparent."""


class LearningServiceError(Exception):
    """A safe, user-displayable assistant service error."""


def ask_noor(question):
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise LearningServiceError(
            "Ask Noor is not connected yet. An administrator needs to add the OPENAI_API_KEY "
            "environment variable before AI answers can be enabled."
        )

    model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini").strip() or "gpt-4.1-mini"
    payload = {
        "model": model,
        "instructions": SYSTEM_INSTRUCTIONS,
        "input": question,
        "tools": [{"type": "web_search"}],
        "max_output_tokens": 1000,
    }
    request = Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=35) as response:
            data = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        if exc.code in (401, 403):
            raise LearningServiceError("Ask Noor is not configured correctly yet. Please contact the administrator.") from exc
        if exc.code == 429:
            raise LearningServiceError("Ask Noor is busy right now. Please wait a moment and try again.") from exc
        raise LearningServiceError("Ask Noor is temporarily unavailable. Please try again later.") from exc
    except (URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
        raise LearningServiceError("Ask Noor could not connect securely just now. Please try again later.") from exc

    answer_parts = []
    citations = []
    seen_urls = set()
    for item in data.get("output", []):
        if item.get("type") != "message":
            continue
        for block in item.get("content", []):
            if block.get("type") != "output_text":
                continue
            if block.get("text"):
                answer_parts.append(block["text"])
            for annotation in block.get("annotations", []):
                if annotation.get("type") != "url_citation":
                    continue
                url = annotation.get("url", "").strip()
                title = annotation.get("title", "").strip() or url
                if url.startswith("https://") and url not in seen_urls:
                    seen_urls.add(url)
                    citations.append({"title": title[:180], "url": url})

    answer = "\n\n".join(part.strip() for part in answer_parts if part.strip()).strip()
    if not answer:
        raise LearningServiceError("Ask Noor did not return an answer this time. Please try again.")
    return {"answer": answer, "citations": citations}
