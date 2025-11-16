import json
import time
from typing import List, Dict
from anthropic import Anthropic
from llama_index.core.workflow import Workflow, step, StartEvent, StopEvent
from llama_index.core import Document
from app.models.schemas import Message, Fact


class ContextExtractionWorkflow(Workflow):
    """LlamaIndex workflow for extracting facts from conversations"""

    def __init__(self, anthropic_api_key: str):
        super().__init__()
        self.client = Anthropic(api_key=anthropic_api_key)

    @step
    async def extract_facts(self, ev: StartEvent) -> StopEvent:
        """Use Claude to extract memorable facts from conversation"""
        message: Message = ev.get("message")

        # Skip extraction for very short messages
        if len(message.text.strip()) < 10:
            return StopEvent(result=[])

        # Only extract from user messages (not AI responses)
        if not message.isUser:
            return StopEvent(result=[])

        prompt = f"""Extract user preferences, facts, and context from this conversation message.
Focus on:
- Personal preferences (food, hobbies, interests)
- Biographical information (job, location, family)
- Opinions and beliefs
- Goals and intentions
- Factual statements about the user

IMPORTANT FORMAT RULES:
- Use DIRECT, CONCISE phrasing (3-6 words maximum)
- DO NOT use "user has", "user is", "user wants" prefixes
- Examples of GOOD facts: "likes SUVs", "allergic to eggs", "prefers vegetarian food", "seeking movie recommendations"
- Examples of BAD facts: "user has interest in movies", "user is looking for breakfast ideas"

Return ONLY a JSON array with this structure:
[
  {{
    "text": "concise fact without 'user' prefix",
    "category": "preference|biographical|interest|opinion|goal|fact",
    "confidence": 0.0-1.0,
    "entities": ["relevant", "entities"]
  }}
]

DO NOT extract:
- Passwords, API keys, or sensitive credentials
- Personally identifiable information like SSN, credit cards
- Temporary context (like "I'm asking about X")

Message from {message.platform}:
"{message.text}"

Return JSON array only, no other text:"""

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )

            # Parse response
            content = response.content[0].text.strip()

            # Extract JSON from potential markdown code blocks
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            facts_data = json.loads(content)

            # Convert to Fact objects
            facts = []
            for fact_dict in facts_data:
                facts.append(Fact(
                    text=fact_dict["text"],
                    category=fact_dict.get("category", "fact"),
                    confidence=fact_dict.get("confidence", 0.7),
                    entities=fact_dict.get("entities", []),
                    platform=message.platform,
                    timestamp=message.timestamp
                ))

            return StopEvent(result=facts)

        except Exception as e:
            print(f"Error extracting facts: {e}")
            # Fallback: simple extraction
            return StopEvent(result=self._simple_extraction(message))

    def _simple_extraction(self, message: Message) -> List[Fact]:
        """Fallback simple extraction without AI"""
        text = message.text.lower()
        facts = []

        # Simple pattern matching
        preference_keywords = ["i like", "i love", "i prefer", "i enjoy", "my favorite"]

        for keyword in preference_keywords:
            if keyword in text:
                facts.append(Fact(
                    text=message.text,
                    category="preference",
                    confidence=0.5,
                    entities=[],
                    platform=message.platform,
                    timestamp=message.timestamp
                ))
                break

        return facts


async def extract_context(message: Message, anthropic_api_key: str) -> List[Fact]:
    """Main function to extract context from a message"""
    start_time = time.time()

    workflow = ContextExtractionWorkflow(anthropic_api_key=anthropic_api_key)

    # Run workflow
    result = await workflow.run(message=message)

    # The result is from StopEvent
    facts = result if isinstance(result, list) else []

    print(f"Extracted {len(facts)} facts in {time.time() - start_time:.2f}s")

    return facts
