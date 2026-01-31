-- Seed System Prompts
-- Bronze (Light & Fun)
INSERT INTO public.system_prompts (type, tier, content) VALUES
('truth', 'bronze', 'What is the last thing you Googled?'),
('truth', 'bronze', 'Do you sing in the shower?'),
('truth', 'bronze', 'Who was your first celebrity crush?'),
('truth', 'bronze', 'What is your weirdest habit?'),
('truth', 'bronze', 'Have you ever peed in a pool?'),
('dare', 'bronze', 'Talk in a British accent for the next 30 seconds.'),
('dare', 'bronze', 'Do 10 jumping jacks while shouting "I love pizza!"'),
('dare', 'bronze', 'Cross your eyes and try to read a chat message.'),
('dare', 'bronze', 'Hold your breath for 20 seconds.'),
('dare', 'bronze', 'Do your best impression of a baby.');

-- Silver (Spicy & Bold)
INSERT INTO public.system_prompts (type, tier, content) VALUES
('truth', 'silver', 'Who in this room/chat is the most attractive?'),
('truth', 'silver', 'What is the biggest lie you ever told a partner?'),
('truth', 'silver', 'Have you ever stalked an ex on social media?'),
('truth', 'silver', 'What is your biggest turn-off?'),
('truth', 'silver', 'Have you ever sent a text to the wrong person on purpose?'),
('dare', 'silver', 'Show the last photo in your camera roll.'),
('dare', 'silver', 'Slow dance with an invisible partner for 15 seconds.'),
('dare', 'silver', 'Text your crush "I had a dream about you".'),
('dare', 'silver', 'Let the chat decide your next emoji reaction.'),
('dare', 'silver', 'Read the last text message you received out loud.');

-- Gold (Deep, Wild & Explicit)
INSERT INTO public.system_prompts (type, tier, content) VALUES
('truth', 'gold', 'What is your wildest fantasy?'),
('truth', 'gold', 'Have you ever cheated or been cheated on?'),
('truth', 'gold', 'What is a secret you vowed never to tell?'),
('truth', 'gold', 'Who is the one person you regret losing?'),
('truth', 'gold', 'What is the most scandalous thing you have done in public?'),
('dare', 'gold', 'Twerk for 10 seconds (or shake your hips).'),
('dare', 'gold', 'Write your ex''s name on your arm with a pen.'),
('dare', 'gold', 'Do a seductive crawl towards the camera.'),
('dare', 'gold', 'Call a random contact and moan "I miss you" then hang up.'),
('dare', 'gold', 'Bite your lip and give your best "bedroom eyes" to the camera.');
