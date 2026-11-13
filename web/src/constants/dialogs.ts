import { TILES } from "./tiles";

export const CHARACTERS = {
  ["the-infected"]: {
    img: "/characters/the-infected.jpg",
    title: "The Infected",
    description:
      "An office worker who fell victim to the Cognivirus and underwent a horrifying transformation. His once-human body has turned into a terrifying monster, his eyes glowing with an unnatural light. He hides within the shadows, his movements erratic and dangerous, constantly threatening anyone who crosses his path.",
  },
  ["the-hopper"]: {
    img: "/characters/the-hopper.jpg",
    title: "The Hopper",
    description:
      "Once a beloved pet, now a ferocious monster after being infected by the Cognivirus. Its once-soft skin and smooth fur have been replaced by sharp claws and deadly fangs. It roams the deserted streets, driven by an instinct to hunt and devour, a horrifying reminder of the virus’s destructive power.",
  },
  ["the-thief"]: {
    img: "/characters/the-thief.jpg",
    title: "The Thief",
    description:
      "Once a cheerful entertainer, now a terrifying harbinger of terror, twisted by the evil Cognivirus. His laughter echoes through abandoned buildings, a chilling prelude to his swift and deadly attacks. He moves like a ghost, his nimble fingers snatching valuables and leaving behind a trail of fear and uncertainty.",
  },
  ["the-floater"]: {
    img: "/characters/the-floater.jpg",
    title: "The Floater",
    description:
      "A spectral entity immune to the laws of gravity, its form swirling and shifting with otherworldly grace. Its touch sends chills down the spine, its presence a grim reminder of unseen forces lurking in the shadows. It glides through the air, its motives shrouded in mystery, a haunting apparition that defies understanding.",
  },
  ["the-clowny"]: {
    img: "/characters/clowny.jpg",
    title: "The Clowny",
    description:
      "A grotesque caricature of a clown, its painted grin hiding malicious intent. Its eyes gleam with mischievous flashes, its movements blurred with deceptive agility. It manipulates others with its false charm, twisting their minds and leading them away from their own desires, a master of deception and psychological warfare.",
  },
};

export const COGNITIVE_DISTORTIONS = [
  {
    title: "What Is the Cognivirus",
    description:
      "When we frequently think about something, over time we begin to believe it as a truth. Our emotions will then follow those thoughts. To stop depression, a person needs to stop negative thinking patterns and replace them with positive ones that are more accurate or realistic. By doing this, depression can be prevented, even before it begins. There are several thinking patterns commonly found in people with depression. In order for their mental health to recover properly, these negative thinking patterns must gradually be eliminated and replaced with ones that better match reality. Some of these negative thinking patterns include:",
  },
  {
    title: "All-or-Nothing Thinking (Black-and-White Thinking)",
    description:
      "Amir applied to the Faculty of Medicine at UGM. Amir failed and was not accepted because his test results were not as good as those of other applicants who were accepted. Amir really wanted to study medicine at UGM and become a surgeon someday. He felt that he had completely failed and believed his future would be bleak forever. He did not want to try again next year or apply to another university or a different faculty or major.",
  },
  {
    title: "All-or-Nothing Thinking (Black-and-White Thinking)",
    description:
      "This thinking pattern often uses words like “always,” “never,” and “forever.” Such thoughts are rarely consistent with reality. Therefore, words like “always,” “never,” and “forever” should be reduced from our vocabulary because of their absolute nature. Situations that truly require such absolute words are very rare and should only be used when they genuinely reflect reality.",
  },
  {
    title: "All-or-Nothing Thinking (Black-and-White Thinking)",
    description:
      "Below is the thinking pattern Amir should adopt after failing to get into UGM’s medical school: “I really want to study medicine at UGM, but it turns out many students are smarter and studied harder, so they were accepted. I am indeed very disappointed, but that doesn’t mean I’ve completely failed or that I’m stupid and have no future. I will study harder and apply to other universities that are still accepting students. I will also try applying to other faculties that may better suit my strengths.”",
  },
  {
    title: "Overgeneralization Thinking Pattern",
    description:
      "When someone has an overgeneralization thinking pattern, a single isolated event is seen as representing everything. Is it true that everyone is bad and that no one likes Endang? What about the friends who invited her to have lunch together at a restaurant? That event shows that there are still people who care about Endang and like her.",
  },
  {
    title: "Mental Filter Thinking Pattern",
    description:
      "People trapped in a mental filter thinking pattern focus only on the negative aspects and ignore or forget the positive ones. To eliminate this thinking pattern, we need to start seeing the positive side of every situation. In Nurul’s case above, she would feel happier if she remembered and paid more attention to the kind young man who offered his seat to her on the bus.",
  },
  {
    title: "Disqualifying the Positive Thinking Pattern",
    description:
      "People with a disqualifying-the-positive thinking pattern tend to distrust or reject positive information. This often occurs in individuals with low self-confidence. To overcome this, the next time someone compliments her, Rita should simply respond with “thank you” and smile. Ignore or forget the inner whisper saying that the person is just being polite. By gradually eliminating this disqualifying-the-positive thinking pattern, life will feel more enjoyable.",
  },
  {
    title: "Jumping to Conclusions Thinking Pattern",
    description:
      "One negative thinking pattern is jumping to conclusions. People with this pattern draw conclusions without looking at real evidence that supports them.",
  },
];

export const TUTORIAL_DIALOGS = [
  {
    type: "message",
    skippable: true,
    text: "Hi, my name is Peter. I’m just an ordinary office worker who suddenly got trapped in an unfamiliar world.",
  },
  {
    type: "message",
    skippable: true,
    text: "In this place, I met a group of people whose faces were filled with despair. Their eyes were empty, hopelessness wrapping around them like a shroud of darkness.",
  },
  {
    type: "message",
    skippable: true,
    text: "After investigating, I discovered that they were infected by a virus called the Cognivirus.",
  },
  {
    type: "message",
    skippable: true,
    text: "The symptoms of this virus are things I’ve often seen before—severely distorted thoughts that torment their victims.",
  },
  {
    type: "message",
    skippable: true,
    text: "Here, I need your help to escape from this place.",
  },
  {
    type: "message",
    skippable: true,
    text: "Because this virus attacks the human brain and mind, I also need to examine you every day to make sure you are not infected.",
  },
  {
    type: "message",
    skippable: true,
    text: "The way we do this is simple: every time we meet, you must write and submit a journal about your day.",
  },
  {
    type: "message",
    skippable: true,
    text: "I will read your daily journal and analyze it periodically to identify patterns and signs of the Cognivirus.",
  },
  {
    type: "message",
    skippable: true,
    text: "The goal is to check whether you have been infected by the Cognivirus or not.",
  },
  {
    type: "message",
    skippable: true,
    text: "Please try writing your first journal now.",
    withAdditional: "journaling",
  },
  {
    type: "message",
    skippable: true,
    text: "Now I will introduce what you will face here.",
  },
  {
    type: "message",
    skippable: true,
    text: "First is 'The Infected.' They are the victims of the Cognivirus I mentioned earlier.",
    withAdditional: "the-infected",
  },
  {
    type: "message",
    skippable: true,
    text: "They constantly insult themselves, and their view of the world is extremely bleak.",
  },
  {
    type: "message",
    skippable: true,
    text: "Therefore, when you face them, you must be able to identify the types of distorted thoughts they are experiencing.",
  },
  {
    type: "message",
    skippable: true,
    text: "Therefore, when you face them, you must be able to identify the types of distorted thoughts they are experiencing.",
  },
  {
    type: "message",
    skippable: true,
    text: "I will teach you how to identify distorted thoughts from the victims of the Cognivirus.",
    withAdditional: "distortions-guide",
  },
  {
    type: "message",
    skippable: true,
    text: "Next, you will face several other creatures that are just as dangerous.",
  },
  {
    type: "message",
    skippable: true,
    text: "Next is 'The Hopper,' a ferocious pet-like creature that can take lives very quickly.",
    withAdditional: "the-hopper",
  },
  {
    type: "message",
    skippable: true,
    text: "Then there is 'The Floater,' a spectral entity that can float and harm you rapidly.",
    withAdditional: "the-floater",
  },
  {
    type: "message",
    skippable: true,
    text: "Then there is 'The Clowny,' an agile entertainer who can amuse you until you are no longer able to be entertained.",
    withAdditional: "the-clowny",
  },
  {
    type: "message",
    skippable: true,
    text: "Lastly, there is 'The Thief.' Although it appears still and motionless, it is ready to stop you from escaping this world.",
    withAdditional: "the-thief",
  },
  {
    type: "message",
    skippable: true,
    text: "I think I’ve given you enough preparation to help me escape from here. Good luck—and don’t forget to fill out your journal first.",
  },
];
