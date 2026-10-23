/**
 * Rich prompts without a model. Most people first meet PromptForge on the website, with no model connected, so
 * the rules engine has to write a genuinely useful prompt too: the full project spec, the co-founder brief and the
 * other approaches, filled from built-in knowledge of common kinds of projects, the region, the platform and any
 * product the user wants to be "like".
 *
 * It never invents facts about the user (budget, brand name, deadline): the prompt asks the AI to ask for those.
 * Technologies appear only as options to consider.
 */
import type { Structure } from './profiles/index.js';
import type { StrategyId, RequestKind } from './strategies.js';
import type { Intent } from './types.js';

// ---------------------------------------------------------------- knowledge

interface Domain {
  key: string;
  /** For the title, e.g. "E-Commerce". */
  short: string;
  /** What is being built, e.g. "e-commerce platform". */
  label: string;
  re: RegExp;
  roles: string[];
  features: string[];
  admin?: string[];
  design: string[];
  payments: boolean;
  images: boolean;
  /** Core flow, for the phases ("catalogue, cart and checkout"). */
  flow: string;
  /** What the first questions should be about. */
  ask: string;
  /** Extra risks for the critique checklist. */
  risks: string[];
}

const DOMAINS: Domain[] = [
  {
    key: 'ecommerce', short: 'E-Commerce', label: 'e-commerce platform',
    re: /\b(e-?commerce|online (store|shop)|shop(ping)? (app|site|website)|store|sell(ing|in)?|products?|cloth(es|ing)?|apparel|fashion|shoes?|sneakers|jewell?ery|cosmetics|grocery|flipkart|amazon|myntra|meesho|nykaa|shopify|ecom)\b/i,
    roles: ['senior software architect', 'full-stack developer', 'UI/UX designer', 'e-commerce business consultant'],
    features: [
      'User registration, login and profile management.',
      'Homepage with banners, offers, trending products and new arrivals.',
      'Categories and product listings with images, prices, sizes, colours and descriptions.',
      'Product search, filters and sorting.',
      'Product details with variant selection and stock availability.',
      'Shopping cart, wishlist and checkout.',
      'Online payments and delivery address management.',
      'Order confirmation, order tracking, cancellations and returns.',
      'Discount coupons, offers and customer reviews.',
      'Mobile-friendly, responsive design.',
    ],
    admin: [
      'Add, edit and delete products, with images, sizes and colours.',
      'Manage inventory and stock.',
      'Process orders, cancellations and returns.',
      'Manage customers, discounts and coupons.',
      'Track sales, revenue and profit.',
      'View reports and business analytics.',
    ],
    design: ['A premium, modern shopping experience with a clean, professional interface.', 'High-quality product photography and attractive product cards.', 'Easy navigation and a quick checkout.', 'A consistent colour palette and typography.', 'Fast loading and excellent mobile usability.'],
    payments: true, images: true,
    flow: 'catalogue, product pages, cart and checkout', ask: 'my brand, the products I will sell first',
    risks: ['Stock can oversell when two people buy the last item at once.', 'Payment success is confirmed only by the payment provider, never by the browser.'],
  },
  {
    key: 'food', short: 'Food Ordering', label: 'food ordering platform',
    re: /\b(food|restaurants?|meals?|tiffin|cloud kitchen|swiggy|zomato|cafe|bakery|menus?|catering|dabba)\b/i,
    roles: ['senior product manager', 'full-stack developer', 'UI/UX designer', 'food-business advisor'],
    features: ['Sign-up and login, with saved addresses.', 'Browse menus with dish photos, prices, ingredients and dietary tags.', 'Search and filter by cuisine, diet, price and delivery time.', 'Cart, checkout and scheduled orders.', 'Live order tracking with clear status updates.', 'Ratings, reviews and reorder in one tap.', 'Offers, coupons and loyalty rewards.'],
    admin: ['Manage the menu, prices, availability and photos.', 'Accept, prepare and dispatch orders from one queue.', 'Manage delivery areas, charges and timings.', 'See daily sales, popular dishes and repeat customers.'],
    design: ['Warm, appetising visuals and a clean layout.', 'Checkout in as few steps as possible.', 'Fast loading and excellent mobile usability.'],
    payments: true, images: true,
    flow: 'menu, cart, checkout and order tracking', ask: 'my kitchen or restaurant, delivery area',
    risks: ['Orders can arrive after closing time or for sold-out dishes.', 'Delivery estimates must stay honest at busy hours.'],
  },
  {
    key: 'booking', short: 'Booking', label: 'booking and appointments platform',
    re: /\b(book(ing|ings)?|appointments?|reservations?|salon|spa|clinic|doctors?|dentist|hotel|slots?|schedul(e|ing)|calendar|turf|consultation)\b/i,
    roles: ['senior product manager', 'full-stack developer', 'UI/UX designer', 'operations consultant'],
    features: ['Sign-up and login for customers and staff.', 'Service list with duration, price and description.', 'Real-time availability calendar and time-slot booking.', 'Booking confirmation, reminders by email or SMS, and easy rescheduling or cancellation.', 'Online payment or deposit at booking.', 'Customer history and reviews.'],
    admin: ['Manage services, staff, working hours and holidays.', 'See and manage the day\'s schedule.', 'Block slots and handle no-shows.', 'Track bookings, revenue and busy hours.'],
    design: ['A calm, trustworthy look with clear availability.', 'Booking in three taps or fewer.', 'Excellent mobile usability.'],
    payments: true, images: false,
    flow: 'services, availability and booking', ask: 'my business, services, opening hours',
    risks: ['Two people must never be able to book the same slot.', 'Time zones and daylight saving can shift appointments.'],
  },
  {
    key: 'education', short: 'Learning', label: 'online learning platform',
    re: /\b(courses?|e-?learning|lms|students?|teachers?|tutor(s|ing)?|school|coaching|classes|quiz(zes)?|exams?|udemy|coursera|byju'?s|unacademy)\b/i,
    roles: ['senior product manager', 'full-stack developer', 'UI/UX designer', 'instructional designer'],
    features: ['Sign-up and login for students and teachers.', 'Course catalogue with descriptions, syllabus and previews.', 'Video lessons, notes and downloadable resources.', 'Quizzes, assignments and progress tracking.', 'Certificates on completion.', 'Discussion or doubt-solving section.', 'Course purchase or subscription.'],
    admin: ['Create and organise courses, lessons and quizzes.', 'Manage students, batches and enrolments.', 'Track progress, completion and revenue.'],
    design: ['A focused, distraction-free learning layout.', 'Clear progress indicators.', 'Works well on phones with slow connections.'],
    payments: true, images: true,
    flow: 'courses, lessons and progress tracking', ask: 'my subject, my students',
    risks: ['Paid videos can be shared or downloaded without protection.', 'Progress must not be lost if a student switches devices.'],
  },
  {
    key: 'fitness', short: 'Fitness', label: 'fitness and health app',
    re: /\b(fitness|gym|workouts?|diet|nutrition|health|yoga|meditation|habits?|weight loss|calories)\b/i,
    roles: ['senior product manager', 'mobile developer', 'UI/UX designer', 'certified fitness and wellness advisor'],
    features: ['Sign-up with goals, current level and preferences.', 'Personalised plans: workouts, diet or habits.', 'Daily tracking with reminders.', 'Progress charts and streaks.', 'Library of exercises or content with clear instructions.', 'Optional subscription for premium plans.'],
    admin: ['Create and update plans and content.', 'See user engagement and retention.', 'Manage subscriptions.'],
    design: ['An energetic, motivating look.', 'One-tap daily logging.', 'Excellent mobile usability and offline use.'],
    payments: true, images: true,
    flow: 'onboarding, plans and daily tracking', ask: 'who the app is for, the plans I will offer',
    risks: ['Health advice needs a clear disclaimer and must not replace a professional.', 'Reminders that nag too much make people uninstall.'],
  },
  {
    key: 'social', short: 'Community', label: 'community and social platform',
    re: /\b(social (media|network)|community|chat app|messaging|forum|dating|followers|instagram|twitter|reddit|discord|whatsapp)\b/i,
    roles: ['senior product manager', 'full-stack developer', 'UI/UX designer', 'community and trust-and-safety advisor'],
    features: ['Sign-up and profiles.', 'Feed of posts with text, images and reactions.', 'Following, comments and sharing.', 'Direct messages or group chats.', 'Notifications.', 'Reporting, blocking and moderation tools.'],
    admin: ['Moderate posts, users and reports.', 'Manage featured content and announcements.', 'See growth and engagement metrics.'],
    design: ['A clean, content-first layout.', 'Fast, smooth scrolling.', 'Excellent mobile usability.'],
    payments: false, images: true,
    flow: 'profiles, feed and interactions', ask: 'the community I want to build',
    risks: ['Spam and abuse arrive on day one, so moderation must exist at launch.', 'Private messages must stay private.'],
  },
  {
    key: 'realestate', short: 'Property Listing', label: 'property listing platform',
    re: /\b(real estate|propert(y|ies)|rentals?|rent|flats?|apartments?|pg|hostels?|housing|brokers?)\b/i,
    roles: ['senior product manager', 'full-stack developer', 'UI/UX designer', 'real-estate business advisor'],
    features: ['Listings with photos, price, location, size and amenities.', 'Search with map view and filters.', 'Saved searches and favourites.', 'Contact or schedule a visit with the owner or agent.', 'Verified listings and reviews.'],
    admin: ['Approve and manage listings.', 'Manage agents, owners and leads.', 'See enquiries and conversion.'],
    design: ['Large, clear photos and an uncluttered layout.', 'A useful map experience.', 'Excellent mobile usability.'],
    payments: false, images: true,
    flow: 'listings, search and enquiries', ask: 'the city and type of properties',
    risks: ['Fake or outdated listings destroy trust.', 'Phone numbers shown publicly attract spam.'],
  },
  {
    key: 'travel', short: 'Travel Planning', label: 'travel planning platform',
    re: /\b(travel|trips?|tours?|tourism|itinerar(y|ies)|flights?|holidays?|vacations?|makemytrip|airbnb)\b/i,
    roles: ['senior product manager', 'full-stack developer', 'UI/UX designer', 'travel-industry advisor'],
    features: ['Destination pages with photos, best time to visit and highlights.', 'Trip planner with a day-by-day itinerary.', 'Budget estimate and packing list.', 'Bookings or links for stays and activities.', 'Saved trips and sharing with friends.'],
    admin: ['Manage destinations, packages and content.', 'Manage enquiries and bookings.', 'See popular destinations and revenue.'],
    design: ['Inspiring, photo-led design.', 'Clear itineraries that read well on a phone.'],
    payments: true, images: true,
    flow: 'destinations, itineraries and bookings', ask: 'the kind of travellers and trips',
    risks: ['Prices and availability go stale fast.', 'Cancellations and refunds need clear rules.'],
  },
  {
    key: 'finance', short: 'Finance', label: 'personal finance app',
    re: /\b(expenses?|budget(ing)? app|finance|invoices?|invoicing|accounting|wallet|loans?|split ?wise|bills?|savings)\b/i,
    roles: ['senior product manager', 'full-stack developer', 'UI/UX designer', 'personal-finance advisor'],
    features: ['Secure sign-up and login.', 'Add expenses and income quickly, with categories.', 'Budgets with alerts.', 'Charts and monthly reports.', 'Recurring bills and reminders.', 'Export to CSV or PDF.'],
    admin: ['Manage categories and defaults.', 'Support and account management.'],
    design: ['Clear numbers and calm colours.', 'Adding an expense in seconds.'],
    payments: false, images: false,
    flow: 'adding transactions, budgets and reports', ask: 'who will use it and how',
    risks: ['Financial data needs strong security and encryption.', 'Rounding and currency errors break trust.'],
  },
  {
    key: 'portfolio', short: 'Personal', label: 'personal website',
    re: /\b(portfolio|personal (website|site|page)|blog|resume (site|website)|landing page|my (own )?website)\b/i,
    roles: ['senior web designer', 'front-end developer', 'copywriter', 'SEO specialist'],
    features: ['A strong hero section that says who I am and what I do.', 'Projects or work with images and short case studies.', 'About section and contact form.', 'Blog or updates section if useful.', 'Fast, accessible and search-engine friendly pages.'],
    design: ['A distinctive, professional look that matches my personality.', 'Clear typography and generous spacing.', 'Smooth on phones.'],
    payments: false, images: true,
    flow: 'home page, project pages and contact', ask: 'my work, who should hire or read me',
    risks: ['Slow images ruin the first impression.', 'The contact form needs spam protection.'],
  },
  {
    key: 'saas', short: 'SaaS', label: 'SaaS product',
    re: /\b(saas|dashboard|crm|erp|analytics|admin panel|internal tool|b2b|subscription software|management system)\b/i,
    roles: ['senior software architect', 'full-stack developer', 'product designer', 'B2B SaaS advisor'],
    features: ['Sign-up, login and team accounts with roles.', 'The core workflow the product exists for.', 'Dashboard with the key numbers.', 'Search, filters and exports.', 'Notifications and activity history.', 'Subscription plans and billing.'],
    admin: ['Manage workspaces, users and plans.', 'See usage, revenue and churn.'],
    design: ['A clean, efficient interface for daily use.', 'Fast tables and keyboard shortcuts.'],
    payments: true, images: false,
    flow: 'accounts, the core workflow and the dashboard', ask: 'who the customers are and the problem it solves',
    risks: ['One customer must never see another customer\'s data.', 'Plan limits must be enforced on the server.'],
  },
  {
    key: 'jobs', short: 'Jobs', label: 'jobs and freelance marketplace',
    re: /\b(jobs?|hiring|recruit(ing|ment)|freelanc(e|ers?)|gigs?|naukri|upwork|fiverr)\b/i,
    roles: ['senior product manager', 'full-stack developer', 'UI/UX designer', 'marketplace strategist'],
    features: ['Profiles for candidates or freelancers and for employers or clients.', 'Job or gig listings with search and filters.', 'Applications or proposals.', 'Messaging between both sides.', 'Ratings and reviews.', 'Payments or subscriptions if needed.'],
    admin: ['Approve listings and profiles.', 'Handle disputes and reports.', 'See activity and revenue.'],
    design: ['Clear, scannable listings.', 'A simple apply flow.'],
    payments: true, images: false,
    flow: 'profiles, listings and applications', ask: 'which side I start with and the niche',
    risks: ['Fake listings and scams.', 'An empty marketplace on launch day.'],
  },
  {
    key: 'events', short: 'Events', label: 'events and ticketing platform',
    re: /\b(events?|tickets?|ticketing|concerts?|webinars?|meetups?|weddings?)\b/i,
    roles: ['senior product manager', 'full-stack developer', 'UI/UX designer', 'events-business advisor'],
    features: ['Event pages with date, venue, schedule and photos.', 'Ticket types, booking and QR-code tickets.', 'Reminders and updates.', 'Check-in at the venue.', 'Sharing and invitations.'],
    admin: ['Create and manage events and ticket types.', 'Scan tickets and see attendance.', 'Track sales.'],
    design: ['Exciting, visual event pages.', 'A two-step ticket purchase.'],
    payments: true, images: true,
    flow: 'event pages, ticketing and check-in', ask: 'the events and the audience',
    risks: ['Tickets can be duplicated if QR codes are not verified.', 'Last-minute changes must reach every attendee.'],
  },
  {
    key: 'productivity', short: 'Productivity', label: 'productivity app',
    re: /\b(to-?do|todos?|task (manager|list|app)|notes?( app)?|note-taking|reminders?|productivity|kanban|planner|journal|notion|trello|evernote)\b/i,
    roles: ['senior product designer', 'full-stack developer', 'UI/UX designer', 'productivity expert'],
    features: ['Create, edit, complete and delete items quickly, with keyboard shortcuts.', 'Due dates, priorities and reminders.', 'Lists, projects or tags to organise everything.', 'Search and filters.', 'Sync across devices, with offline use.', 'Light and dark themes.'],
    design: ['A calm, minimal interface that stays out of the way.', 'Adding an item in one step.', 'Fast and smooth on phone and desktop.'],
    payments: false, images: false,
    flow: 'creating, organising and completing items', ask: 'how I work today and what annoys me about other apps',
    risks: ['Data must never be lost when two devices edit at once.', 'Reminders must fire at the right time in every time zone.'],
  },
  {
    key: 'game', short: 'Game', label: 'game',
    re: /\b(games?|gaming|puzzle|arcade|multiplayer|unity|godot)\b/i,
    roles: ['senior game designer', 'gameplay programmer', 'game artist', 'playtester'],
    features: ['A clear core game loop.', 'Controls that feel good on the target device.', 'Levels or difficulty that ramp up.', 'Scoring, progress and rewards.', 'Sound and visual feedback.', 'Pause, settings and saving progress.'],
    design: ['A consistent art style.', 'Readable on a small screen.'],
    payments: false, images: true,
    flow: 'the core loop, controls and first level', ask: 'the genre, the platform and the feeling of the game',
    risks: ['The first minute decides if people keep playing.', 'Performance drops on older phones.'],
  },
];

const GENERIC: Domain = {
  key: 'generic', short: '', label: 'application',
  re: /$^/,
  roles: ['senior software architect', 'full-stack developer', 'UI/UX designer', 'product strategist'],
  features: ['Every feature I described above, worked out in detail.', 'User accounts, if the product needs them.', 'A simple, clear navigation and search.', 'Notifications where they help.', 'A responsive design for mobile and desktop.'],
  design: ['A clean, modern and professional interface.', 'Fast loading and excellent mobile usability.', 'A consistent colour palette and typography.'],
  payments: false, images: false,
  flow: 'the main features', ask: 'what problem it solves and who it is for',
  risks: [],
};

const SITE: Domain = {
  key: 'site', short: '', label: 'business website',
  re: /\b(landing page|one[- ]page(r)?|business (website|site)|company (website|site)|simple website|website for my)\b/i,
  roles: ['senior web designer', 'front-end developer', 'conversion copywriter', 'local SEO specialist'],
  features: [
    'A strong hero section that says what the business offers and why it is special.',
    'Products or services with photos and prices.',
    'About the business and the people behind it.',
    'Customer reviews and testimonials.',
    'Contact form, phone and WhatsApp buttons, opening hours and a map.',
    'Search-engine friendly pages, so local customers can find it.',
    'An easy way for me to update text, photos and prices without code.',
  ],
  design: ['A look that matches the brand, with high-quality photos.', 'One clear call to action on every screen.', 'Clean typography, generous spacing and fast loading on phones.'],
  payments: false, images: true,
  flow: 'the home page, the products or services and the contact section', ask: 'my business, what makes it special, who my customers are',
  risks: ['Slow images ruin the first impression.', 'The contact form needs spam protection.'],
};

/** Words that mean the site must take orders, bookings or payments, so it is more than a showcase page. */
const TRANSACTIONAL = /\b(sell(ing)?|orders?|ordering|book(ing)?|appointments?|checkout|cart|payments?|subscriptions?|log ?in|sign ?up|accounts?)\b/i;

const BRANDS = ['Flipkart', 'Amazon', 'Myntra', 'Meesho', 'Nykaa', 'Swiggy', 'Zomato', 'Uber', 'Ola', 'Airbnb', 'Netflix', 'Instagram', 'Twitter', 'LinkedIn', 'Spotify', 'YouTube', 'Notion', 'Slack', 'Trello', 'Zoom', 'WhatsApp', 'Paytm', 'PhonePe', 'Shopify', 'Etsy', 'Udemy', 'Coursera', 'Duolingo', 'Tinder', 'Practo', 'OYO', 'MakeMyTrip', 'BigBasket', 'Zepto', 'Blinkit', 'Upwork', 'Fiverr', 'Naukri', 'Canva', 'Figma', 'Stripe', 'Discord', 'Reddit', 'Pinterest', 'Snapchat', 'BookMyShow', 'Dunzo', 'Urban Company', 'Cred', 'Groww', 'Zerodha', 'Byju\'s', 'Unacademy'];

type Region = 'india' | 'us' | 'uk' | 'eu' | 'none';
const REGION_RE: [Region, RegExp][] = [
  ['india', /\b(india|indian|flipkart|myntra|meesho|nykaa|swiggy|zomato|paytm|phonepe|upi|rupees?|inr|gst|zepto|blinkit|bigbasket|dunzo|ola|oyo|practo|naukri|bookmyshow|zerodha|groww|mumbai|delhi|bangalore|bengaluru|pune|hyderabad|chennai|kolkata|ahmedabad|jaipur|goa|lucknow|indore|surat|kochi|banao|karna|chahiye|mera|meri|hai|kaise|kuch)\b|₹|\brs\.?\s?\d/i],
  ['uk', /\b(uk|united kingdom|britain|british|london|manchester|pounds?|gbp)\b|£/i],
  ['eu', /\b(europe|european|eu|germany|france|spain|italy|netherlands|euros?|gdpr)\b|€/i],
  ['us', /\b(usa|united states|america|american|new york|california|texas|dollars?|usd)\b|\$\d/i],
];

export interface RichContext {
  domain: Domain;
  region: Region;
  platform: 'web' | 'mobile' | 'both' | 'unsure';
  brand?: string;
  /** The user's request as one clean sentence, first person. */
  request: string;
  title: string;
  /** Technologies the user named; they are requirements, not suggestions. */
  tech: string[];
}

/** The domain with the most distinct keyword hits; ties go to the earlier (more common) domain. */
function pickDomain(text: string): Domain {
  // A landing page or a simple business site is a showcase, not an online shop or booking system.
  if (SITE.re.test(text) && !TRANSACTIONAL.test(text)) return SITE;
  const t = text.replace(/\b(app|play) store\b/gi, ' ');
  let best = GENERIC;
  let bestHits = 0;
  for (const d of DOMAINS) {
    const hits = new Set((t.match(new RegExp(d.re.source, 'gi')) ?? []).map((m) => m.toLowerCase())).size;
    if (hits > bestHits) {
      best = d;
      bestHits = hits;
    }
  }
  return best;
}

const PRODUCT = /\b(cloth(?:es|ing)|fashion|shoes?|sneakers|jewell?ery|cosmetics|skincare|grocery|furniture|electronics|books|toys?|handmade|organic|pet|bakery|sarees?|ethnic wear|kids wear|perfumes?|watches|gifts?|home decor|tiffin|coffee|tea|cake|salon|spa|clinic|gym|restaurant|cafe|hotel|school|coaching|dental)\b/i;
const SMALL = new Set(['and', 'or', 'of', 'for', 'the', 'a', 'an', 'to', 'in']);
const titleCase = (s: string) => s.split(' ').map((w, i) => (i && SMALL.has(w) ? w : w.replace(/(^|-)(\w)/g, (_, a: string, b: string) => a + b.toUpperCase()))).join(' ');

export function readContext(text: string, tech: string[] = []): RichContext {
  const domain = pickDomain(text);
  const region = (REGION_RE.find(([, re]) => re.test(text))?.[0] ?? 'none') as Region;
  const mobile = /\b(mobile app|android|ios|iphone|play store|app store|phone app)\b/i.test(text);
  const web = /\b(website|web ?site|web app|landing page|portal|online store|webpage)\b/i.test(text);
  const platform = mobile && web ? 'both' : mobile ? 'mobile' : web ? 'web' : 'unsure';
  const brand = BRANDS.find((b) => new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\']/g, '\\$&')}\\b`, 'i').test(text));
  let request = text.trim().replace(/\s+/g, ' ');
  // "Build an app for X" reads as an order to the AI; the prompt speaks as the user.
  request = request.replace(/^(?:please\s+)?(?:make|build|create|design|develop|give)\s+me\s+/i, 'I want ');
  if (/^(build|create|make|develop|design|start|launch)\b/i.test(request)) request = `I want to ${request.charAt(0).toLowerCase()}${request.slice(1)}`;
  request = request.charAt(0).toUpperCase() + request.slice(1);
  if (!/[.!?]$/.test(request)) request += '.';
  if (brand) request = request.replace(new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\']/g, '\\$&')}\\b`, 'gi'), brand);
  // "a todo app", "my salon booking website": the words the user used for the thing itself make the best title.
  const named = text.match(/\b(?:an?|my|own)\s+((?:[a-z][a-z-]*\s){0,2}?)(landing page|app|application|website|site|platform|store|game)\b/i);
  const nounWord = named?.[2]?.toLowerCase();
  const what = nounWord === 'landing page' ? 'Landing Page' : nounWord === 'website' || nounWord === 'site' ? 'Website' : nounWord === 'store' ? 'Store' : nounWord === 'platform' ? 'Platform' : nounWord === 'game' ? 'Game' : nounWord === 'app' && platform !== 'web' ? 'App' : platform === 'web' ? 'Website' : platform === 'mobile' ? 'App' : 'Application';
  const namedWords = named?.[1]?.trim().toLowerCase().split(' ').filter((w) => w && !['own', 'new', 'simple', 'small', 'good', 'nice', 'web', 'mobile', 'online'].includes(w)) ?? [];
  const subject = text.match(PRODUCT)?.[1]?.toLowerCase();
  const words = namedWords.length ? namedWords : [subject, domain.short].filter((w): w is string => !!w);
  if (subject && namedWords.length && !namedWords.some((w) => w.startsWith(subject.replace(/s$/, '')))) words.unshift(subject);
  const label = titleCase(words.join(' ')).replace(/\bTodo\b/, 'To-Do');
  const title = `Build My Own ${label ? `${label} ` : ''}${what}`;
  return { domain, region, platform, brand, request, title, tech };
}

// ---------------------------------------------------------------- pieces

const an = (w: string) => (/^[aeiou]/i.test(w) ? `an ${w}` : `a ${w}`);

function techOptions(c: RichContext): string[] {
  if (c.domain.key === 'game') {
    return ['Engine: Unity or Godot, or Phaser for a web game.', 'Art and sound: free asset packs to start, then a consistent style of my own.', 'Saving progress: on the device first, cloud saves later.', 'Publishing: Google Play, the App Store or itch.io.'];
  }
  if (c.domain.key === 'portfolio' || c.domain.key === 'site') {
    return ['Site: Next.js or Astro, or a no-code builder such as Framer if I prefer.', 'Content: Markdown files or a simple headless CMS.', 'Contact form: Formspree or Resend.', 'Hosting: Vercel or Netlify, with my own domain.'];
  }
  const out: string[] = [];
  if (c.platform === 'mobile') out.push('Mobile app: React Native (Expo) or Flutter.');
  else if (c.platform === 'both') out.push('Website: Next.js and React.', 'Mobile app: React Native (Expo) or Flutter.');
  else out.push('Frontend: Next.js and React.');
  out.push('Backend: Node.js (Express or NestJS) or Python (Django or FastAPI).', 'Database: PostgreSQL or Supabase.', 'Authentication: secure email or phone login, for example Supabase Auth, Clerk or Firebase Auth.');
  if (c.domain.payments) out.push(c.region === 'india' ? 'Payments: Razorpay or Cashfree (UPI, cards, net banking).' : 'Payments: Stripe or PayPal.');
  if (c.domain.images) out.push('Image storage: Cloudinary or Supabase Storage.');
  out.push('Hosting: Vercel, Render or Railway.');
  return out;
}

function businessRequirements(c: RichContext): string[] {
  const d = c.domain;
  const ships = ['ecommerce', 'food'].includes(d.key);
  if (c.region === 'india') {
    return [
      'Prices in Indian rupees (₹).',
      ...(d.payments ? [`UPI, cards and net banking${ships ? ', plus Cash on Delivery' : ''}.`] : []),
      ...(ships ? ['Indian addresses and PIN codes.', 'Shipping charges and delivery estimates.'] : []),
      ...(d.payments ? ['GST and invoices where applicable.'] : []),
      ...(ships ? ['Inventory and profit tracking.'] : []),
      'Optional Hindi or regional-language support.',
    ];
  }
  const cur = c.region === 'uk' ? 'pounds (£)' : c.region === 'eu' ? 'euros (€)' : c.region === 'us' ? 'US dollars ($)' : '';
  if (!cur && !d.payments) return [];
  return [
    cur ? `Prices in ${cur}.` : 'Prices and taxes for [my country].',
    ...(d.payments ? ['The payment methods people in my market expect.'] : []),
    ...(ships ? ['Shipping charges, delivery estimates and returns policy.'] : []),
    ...(c.region === 'eu' || c.region === 'uk' ? ['GDPR-compliant consent and data handling.'] : []),
    ...(c.region === 'us' ? ['Sales tax where applicable.'] : []),
  ];
}

const IMPORTANT = [
  'Do not give me only theory. Help me build a working application.',
  'Provide complete code files with their correct paths.',
  'Explain the installation and setup commands.',
  'Use a clean, maintainable project structure.',
  'Never expose API keys, payment secrets or database credentials in frontend code.',
  'Include validation, error handling, security and tests.',
  'Use realistic sample data during development.',
  'Keep the architecture flexible so I can expand later.',
];

function phases(c: RichContext): string[] {
  const d = c.domain;
  return [
    'Phase 1: Define the requirements, architecture, features and database schema.',
    'Phase 2: Design the UI/UX and build the main screens.',
    ['site', 'portfolio', 'game'].includes(d.key) ? `Phase 3: Build ${d.flow}.` : `Phase 3: Build accounts, the database and the core flow: ${d.flow}.`,
    d.key === 'game' ? 'Phase 4: Add sound, effects, progress saving and polish.'
      : d.key === 'site' || d.key === 'portfolio' ? 'Phase 4: Add the contact form, SEO and analytics, then polish every page.'
      : d.payments ? 'Phase 4: Add payments, orders and notifications.' : 'Phase 4: Add notifications, integrations and polish.',
    ...(d.admin ? ['Phase 5: Build the admin dashboard and analytics.'] : []),
    `Phase ${d.admin ? 6 : 5}: Test the complete application, secure it and deploy it.`,
  ];
}

function inspired(c: RichContext): string {
  return c.brand ? ` I want it inspired by how ${c.brand} works, but with its own brand identity, design and features, not a copy of ${c.brand}.` : '';
}

function firstTask(c: RichContext): string {
  const where = c.platform === 'unsure' ? ', and whether I want a website, a mobile app, or both' : '';
  return `Before writing code, ask me the essential questions about ${c.domain.ask}, my budget, my target customers and my preferred design${where}. Then recommend the best affordable architecture and a practical roadmap. Start with an MVP that I can launch and improve as I grow.`;
}

// ---------------------------------------------------------------- layout

interface Section {
  title: string;
  /** A sentence before the bullets. */
  lead?: string;
  lines: string[];
  /** Plain paragraph, not bullets. */
  para?: boolean;
  /** Lines are already numbered. */
  numbered?: boolean;
}

function tag(title: string): string {
  return title.toLowerCase().replace(/^\d+\.\s*/, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

/** Numbered plain headings for Markdown targets (as people write them), XML tags for Claude. */
function layout(head: string[], sections: Section[], structure: Structure): string {
  const body = sections.map((s) => {
    const list = s.para ? s.lines.join(' ') : s.lines.map((l) => (s.numbered ? l : `* ${l}`)).join('\n');
    const text = s.lead ? `${s.lead}\n${list}` : list;
    return structure === 'xml' ? `<${tag(s.title)}>\n${text}\n</${tag(s.title)}>` : `${s.title}\n${text}`;
  });
  return [...head, ...body].join('\n\n');
}

// ---------------------------------------------------------------- project approaches

function projectSpec(c: RichContext, structure: Structure): string {
  const d = c.domain;
  let n = 0;
  const num = (t: string) => `${++n}. ${t}`;
  const stack = c.tech.length
    ? `I want to use ${c.tech.join(', ')}. Recommend the rest of a suitable modern stack and explain the best choices for a beginner building a real product. Consider:`
    : 'Recommend a suitable modern technology stack and explain the best choices for a beginner building a real product. Consider:';
  const sections: Section[] = [
    { title: num('Business Goal'), lines: [`Help me build a professional, scalable and modern ${d.label} with its own brand identity, design and features.`], para: true },
    { title: num(d.key === 'game' ? 'Gameplay and Features' : 'Core Features'), lines: d.features },
    ...(d.admin ? [{ title: num('Admin Dashboard'), lead: 'Create an admin panel where I can:', lines: d.admin }] : []),
    { title: num('Technology Stack'), lead: stack, lines: techOptions(c) },
    { title: num('Design Requirements'), lines: d.design },
  ];
  const biz = businessRequirements(c);
  if (biz.length) sections.push({ title: num(c.region === 'india' ? 'Business Requirements for India' : 'Business Requirements'), lines: biz });
  sections.push({ title: num('Development Approach'), lead: 'Build this project step by step:', lines: phases(c) });
  sections.push({ title: num('Important Instructions'), lines: IMPORTANT });
  sections.push({ title: 'First Task', lines: [firstTask(c)], para: true });
  const head = [
    `Prompt: ${c.title}`,
    `Act as ${an(d.roles.slice(0, -1).join(', '))} and ${d.roles[d.roles.length - 1]}.`,
    `${c.request}${inspired(c)} I want a real, working product that I can launch and grow, not a demo.`,
  ];
  return layout(head, sections, structure);
}

function projectCofounder(c: RichContext): string {
  const d = c.domain;
  const low = (s: string) => s.charAt(0).toLowerCase() + s.slice(1).replace(/\.$/, '');
  const pay = c.region === 'india' ? 'UPI, cards, net banking and Cash on Delivery where it fits, with GST invoices' : 'the payment methods my customers expect';
  const bullets = [
    `**Customer experience:** ${d.features.slice(0, 5).map(low).join(', ')}.`,
    ...(d.admin ? [`**Business management:** ${d.admin.slice(0, 4).map(low).join(', ')}.`] : []),
    ...(d.payments ? [`**Payments and delivery:** ${pay}.`] : []),
    '**Brand identity:** a unique brand name, logo direction, colour palette and a modern, premium experience.',
    '**Technology:** the best affordable technology stack for a secure, scalable, production-ready application.',
    `**Future growth:** a foundation I can extend with new features${c.platform === 'mobile' ? '' : ' and, later, Android and iOS apps'}.`,
  ];
  return [
    `${c.request}${inspired(c)}`,
    'Act as my technical co-founder, product strategist, and expert full-stack developer.',
    `My goal is to create ${an(d.label)} that I own and control.`,
    'I want you to help me build a complete application that includes:',
    bullets.map((b) => `* ${b}`).join('\n'),
    "I don't want a basic demo or just a static website. I want a real platform that can serve real customers and grow.",
    'Work with me step by step. First understand my vision and budget. Then plan the architecture, design the interface, build the frontend and backend, connect the database, implement the essential features, test everything, and guide me through deployment.',
    "Important: don't generate the entire project in one response. Work in stages, explain your decisions in simple language, and provide working code with clear file paths.",
    'Start by helping me define the right business model and the first version of my application.',
  ].join('\n\n');
}

function projectStepwise(c: RichContext, structure: Structure): string {
  const d = c.domain;
  return layout([`${c.request}${inspired(c)}`, `Act as ${an(d.roles[0]!)} who delivers in clear phases.`], [
    { title: 'Goal', lines: [`Help me build ${an(d.label)} that I can launch and grow.`], para: true },
    { title: 'Phases', numbered: true, lines: [
      '1. Understand my vision, users and budget. Deliverable: a one-page brief. Check: I approve it.',
      `2. Plan the architecture and data model. Deliverable: a diagram and the database schema. Check: every feature has a home.`,
      '3. Design the main screens. Deliverable: wireframes for each screen. Check: the core flow works end to end on paper.',
      `4. Build the core flow (${d.flow}). Deliverable: working code with file paths. Check: I can run it locally.`,
      `5. Add ${d.payments ? 'payments, ' : ''}${d.admin ? 'the admin dashboard, ' : ''}notifications and polish. Deliverable: a feature-complete MVP. Check: tested on phone and desktop.`,
      '6. Test, secure and deploy. Deliverable: a live link and setup notes. Check: real users can sign up and use it.',
    ] },
    { title: 'Working Rules', lines: ['Finish one phase before starting the next, and tell me when a phase is done.', 'State your assumptions and recommend technologies as options, with the trade-offs.', 'Give working output with clear file paths, explained in simple language.'] },
    { title: 'First Step', lines: [firstTask(c)], para: true },
  ], structure);
}

function projectInterview(c: RichContext, structure: Structure): string {
  const d = c.domain;
  const qs = [
    `Who are my first customers, and what problem does this ${d.label} solve for them?`,
    `What are the three features the first version must have?`,
    `Website, mobile app, or both, and on which devices will people use it most?`,
    'What is my budget and timeline for the first version?',
    `Do I already have a brand name, logo or design style in mind?`,
    ...(d.payments ? ['How will I take payments, and are there taxes or invoices to handle?'] : []),
    `What does success look like after three months?`,
  ];
  return layout([`${c.request}${inspired(c)}`], [
    { title: 'Instruction', lines: ['Do not start building yet. First ask me the questions below, wait for my answers, and only then plan and build.'], para: true },
    { title: 'Questions', lines: qs.map((q, i) => `${i + 1}. ${q}`), numbered: true },
    { title: 'After My Answers', lines: ['Recommend an affordable architecture and a practical roadmap, then build the MVP with me in stages, explaining your decisions in simple language and giving working code with clear file paths.'], para: true },
  ], structure);
}

function projectExpert(c: RichContext, structure: Structure): string {
  const d = c.domain;
  return layout([`Act as ${an(d.roles[0]!)} who has designed and shipped many ${d.label}s from idea to launch.`, `${c.request}${inspired(c)}`], [
    { title: 'What Great Looks Like', lines: [...d.design.slice(0, 2), `The core flow (${d.flow}) works smoothly on a phone.`, 'Secure by default: no secrets in the frontend, validated input, safe payments.', 'Simple for me to run, change and grow.'] },
    { title: 'Trade-offs to Weigh', lines: ['Build from scratch or start from a ready platform, and what each costs me.', 'Website first, mobile app first, or both.', 'Managed services (faster, monthly cost) or self-hosted (cheaper, more work).', 'Which features to leave out of the first version.'] },
    { title: 'Deliverable', lines: ['A recommended approach with the reasons, a simple architecture, the first screens, and working code with clear file paths, explained in simple language.'], para: true },
    { title: 'First Step', lines: [firstTask(c)], para: true },
  ], structure);
}

function projectCritique(c: RichContext, structure: Structure): string {
  const d = c.domain;
  return layout([`${c.request}${inspired(c)}`, `Act as ${an(d.roles[0]!)} and a critical reviewer.`], [
    { title: 'Requirements', lines: d.features.slice(0, 6) },
    { title: 'Process', lines: ['1. Draft the plan: architecture, data model, main screens and the first code.', '2. Critique the draft against the checklist below and list every gap.', '3. Deliver an improved final version and say what you changed and why.'], numbered: true },
    { title: 'Checklist', lines: [...d.risks, 'No API keys or secrets in the frontend.', 'Every form validates input and shows clear errors.', 'Works well on a phone with a slow connection.', 'I can run it locally from the setup notes alone.'] },
    { title: 'Output', lines: ['The final plan and code with file paths, plus a short list of what the critique changed.'], para: true },
  ], structure);
}

// ---------------------------------------------------------------- task approaches

interface TaskKnowledge { great: string[]; questions: string[]; checks: string[]; phases: string[] }
const TASKS: Partial<Record<Intent, TaskKnowledge>> & { default: TaskKnowledge } = {
  email: {
    great: ['A clear subject line that says what the email is about.', 'The request or main point in the first two sentences.', 'The right tone for the reader: polite, warm or firm as needed.', 'Short paragraphs and one clear next step.', 'A proper greeting and sign-off.'],
    questions: ['Who exactly is the reader, and how well do I know them?', 'What do I want them to do after reading?', 'What dates, numbers or details must be included?', 'How formal should it be?', 'Is there any history or context they should be reminded of?'],
    checks: ['Is the request clear within the first two sentences?', 'Is the tone right for this reader?', 'Are all dates, names and numbers correct?', 'Is there one clear next step?', 'Is it short enough to read on a phone?'],
    phases: ['Restate who the email is for and what it must achieve.', 'Outline the key points in order.', 'Write the email with a subject line.', 'Check tone, length and details, then give the final version.'],
  },
  writing: {
    great: ['A strong opening line that makes people want to keep reading.', 'One clear message, said in plain words.', 'The right tone and length for where it will be used.', 'Concrete details instead of generic phrases.', 'A clean structure that is easy to scan.'],
    questions: ['Who will read this, and where (social media, website, print)?', 'What is the one thing they should remember?', 'What tone do I want?', 'How long should it be?', 'Are there words, facts or a call to action that must be included?'],
    checks: ['Does the first line grab attention?', 'Is there one clear message?', 'Is every sentence specific, with no filler?', 'Is the tone consistent?', 'Does it fit the length and the platform?'],
    phases: ['Restate the audience, purpose and tone.', 'Offer a short outline or two angles.', 'Write the full piece.', 'Polish it and give two alternative openings.'],
  },
  learning: {
    great: ['Starts from what I already know, in simple words.', 'One everyday analogy that makes it click.', 'A small worked example.', 'Builds up step by step, from basic to deeper.', 'Ends with a quick check of understanding.'],
    questions: ['What do I already know about this topic?', 'Why am I learning it (exam, job, curiosity)?', 'Do I prefer examples, analogies or diagrams?', 'How deep should we go?', 'How much time do I have?'],
    checks: ['Is every new term explained before it is used?', 'Is there a concrete example?', 'Does each step build on the last?', 'Is it short enough to stay focused?', 'Is there a way for me to check I understood?'],
    phases: ['Find out what I already know.', 'Explain the core idea with an analogy.', 'Walk through a worked example.', 'Give me a short exercise and then check my answer.'],
  },
  research: {
    great: ['Recent, reliable sources, with links and dates.', 'A clear comparison table where options are compared.', 'Facts separated from opinions.', 'A short recommendation with the reasons.', 'Gaps and uncertainties stated honestly.'],
    questions: ['What decision will this research help me make?', 'Which options or sources should be included or left out?', 'How recent must the information be?', 'Which criteria matter most to me?', 'How detailed should the answer be?'],
    checks: ['Is every claim backed by a source with a date?', 'Are the comparison criteria the ones I care about?', 'Are facts separated from opinions?', 'Is there a clear recommendation?', 'Are uncertainties called out?'],
    phases: ['Restate the question and the criteria.', 'Gather and summarise the sources.', 'Compare the options in a table.', 'Give a recommendation with reasons and caveats.'],
  },
  analysis: {
    great: ['The main finding stated first, in one sentence.', 'Numbers shown with what they mean.', 'Patterns, outliers and likely causes explained.', 'Clear, practical recommendations.', 'Assumptions and limits of the data stated.'],
    questions: ['What decision will this analysis inform?', 'What does the data cover, and how was it collected?', 'Which metrics matter most?', 'Who will read the result?', 'Should I get charts, a table or a short summary?'],
    checks: ['Is the main finding stated first?', 'Are the numbers right and explained?', 'Are causes separated from correlation?', 'Are the recommendations practical?', 'Are the data limits stated?'],
    phases: ['Restate the question and check the data.', 'Describe the key numbers and patterns.', 'Explain the likely causes.', 'Give recommendations and the next analysis to run.'],
  },
  brainstorming: {
    great: ['Many varied ideas, from safe to bold.', 'Each idea in one line with why it could work.', 'Ideas that fit my constraints.', 'The best three marked, with the reason.', 'A quick next step for the favourite.'],
    questions: ['Who is this for?', 'What constraints do I have (budget, time, style)?', 'What have I already tried or rejected?', 'Do I want practical ideas, wild ideas, or both?', 'How many ideas do I need?'],
    checks: ['Are the ideas truly different from each other?', 'Do they fit my constraints?', 'Is each one explained in a line?', 'Are the best ones picked with a reason?', 'Is there a clear next step?'],
    phases: ['Restate the goal and constraints.', 'Generate a wide list of ideas.', 'Group and rank them.', 'Develop the top three with next steps.'],
  },
  debugging: {
    great: ['The root cause found, not just the symptom.', 'The smallest fix, as a diff.', 'Why the bug happened, in plain words.', 'How to verify the fix.', 'How to prevent it next time.'],
    questions: ['What is the exact error message and where does it appear?', 'What did I expect, and what happens instead?', 'What changed just before it started?', 'Which versions of the language and libraries am I using?', 'Can I share the relevant code?'],
    checks: ['Does the fix address the root cause?', 'Is the change as small as possible?', 'Is there a way to verify it?', 'Could it break something else?', 'Is there a test that would catch it again?'],
    phases: ['Restate the problem and the expected behaviour.', 'List the likely causes and how to check each one.', 'Apply the smallest fix as a diff.', 'Verify the fix and suggest a test to prevent it.'],
  },
  coding: {
    great: ['Working code with file names and paths.', 'Clear structure and readable names.', 'Errors and edge cases handled.', 'A short explanation of key decisions.', 'How to run and test it.'],
    questions: ['Which language, framework and versions?', 'Where will this code run?', 'What inputs and outputs are expected?', 'Are there constraints on libraries or style?', 'Do I want the full file or a diff?'],
    checks: ['Does it run as given?', 'Are edge cases and errors handled?', 'Is it readable and consistent?', 'Are there tests or a way to verify it?', 'Is anything insecure?'],
    phases: ['Restate the task and assumptions.', 'Plan the approach and structure.', 'Write the code with file paths.', 'Explain how to run and test it.'],
  },
  default: {
    great: ['A direct answer to exactly what I asked.', 'Concrete, specific details instead of generic advice.', 'A clear structure that is easy to scan.', 'Practical next steps.', 'Assumptions stated where information is missing.'],
    questions: ['What is the goal behind this request?', 'Who is it for?', 'What constraints do I have (time, budget, location)?', 'What format do I want the answer in?', 'What would make this really useful for me?'],
    checks: ['Does it answer exactly what was asked?', 'Is it specific to my situation?', 'Is it easy to scan?', 'Are there practical next steps?', 'Are assumptions stated?'],
    phases: ['Restate the goal and assumptions.', 'Outline the approach.', 'Produce the full answer.', 'Check it against the goal and give next steps.'],
  },
};

/**
 * Task approaches are built on the compact brief (which already keeps pasted code and data exactly) with the
 * approach's own sections added in the target's layout.
 */
function taskApproach(brief: string, id: StrategyId, intent: Intent, structure: Structure): string | undefined {
  const k = TASKS[intent] ?? TASKS.default;
  const list = (lines: string[], numbered: boolean) => lines.map((l, i) => (numbered ? `${i + 1}. ${l}` : `- ${l}`)).join('\n');
  const add = (title: string, lines: string[], numbered = false) =>
    structure === 'xml'
      ? `<${tag(title)}>\n${list(lines, numbered)}\n</${tag(title)}>`
      : structure === 'task-first'
        ? `${title}:\n${list(lines, numbered)}`
        : `## ${title}\n${list(lines, numbered)}`;
  const tail = brief.match(/\n\n((?:If anything|Ask up to 3)[^\n]*)$/);
  const body = tail ? brief.slice(0, tail.index) : brief;
  const close = tail ? `\n\n${tail[1]}` : '';
  switch (id) {
    case 'expert':
      return `${body}\n\n${add('What Great Looks Like', k.great)}${close}`;
    case 'stepwise':
      return `${body}\n\n${add('Work in Phases', [...k.phases, 'Finish each phase before starting the next.'], true)}${close}`;
    case 'interview':
      return `${body}\n\n${add('Before You Start', ['Do not start yet. First ask me these questions, one list, and wait for my answers.'])}\n\n${add('Questions', k.questions, true)}`;
    case 'critique':
      return `${body}\n\n${add('Process', ['Write a first draft.', 'Critique it against the checklist below.', 'Deliver the improved final version and say what you changed.'], true)}\n\n${add('Checklist', k.checks)}${close}`;
    default:
      return undefined;
  }
}

export interface RichOffline {
  prompt: string;
  changes: string[];
}

const REGION_NAME: Record<Exclude<Region, 'none'>, string> = { india: 'India', uk: 'the United Kingdom', eu: 'Europe', us: 'the United States' };
const plain = (s: string) => s.replace(/\.$/, '');

/**
 * Notes for the model when it writes a project prompt: what this kind of product usually needs, the market the
 * request points to, and technology options. The same knowledge the rules engine uses, so a small model gets the
 * domain and the country right instead of copying an example (a London salon offered UPI payments without this).
 */
export function projectNotes(text: string, tech: string[] = []): string[] {
  const c = readContext(text, tech);
  const d = c.domain;
  const notes: string[] = [];
  if (d.key !== 'generic') notes.push(`What ${an(d.label)} usually needs: ${d.features.map(plain).join('; ')}.`);
  if (d.admin) notes.push(`The owner's side: ${d.admin.map(plain).join('; ')}.`);
  notes.push(
    c.region === 'none'
      ? 'Market: not stated. Do not assume a country, currency, tax or payment method; tell the AI to ask.'
      : `Market: ${REGION_NAME[c.region]}. ${businessRequirements(c).map(plain).join('; ')}. Name no payment methods, currencies or laws of other countries.`,
  );
  notes.push(`Technology options to suggest (options, not decisions): ${techOptions(c).map(plain).join('; ')}.`);
  if (c.brand) notes.push(`${c.brand} is inspiration only: its own brand and design, no ${c.brand} APIs, data or logo.`);
  return notes;
}

/**
 * The rich, rules-based prompt for an approach, or undefined when the plain brief is the right answer
 * (the "Short and sharp" approach, image prompts, or a spec asked for on a small task).
 */
export function renderRichOffline(o: {
  text: string;
  kind: RequestKind;
  intent: Intent;
  strategy: StrategyId;
  structure: Structure;
  /** The plain brief for this request, which task approaches build on. */
  brief: string;
  /** Technologies the user named. */
  tech?: string[];
  /** Pasted code or data: keep the brief's verbatim input section instead of a project write-up. */
  hasInputs?: boolean;
  strategyName: string;
}): RichOffline | undefined {
  if (o.strategy === 'brief' || o.structure === 'image') return undefined;
  if (o.kind === 'project' && !o.hasInputs) {
    const c = readContext(o.text, o.tech);
    const structure = o.structure === 'xml' ? 'xml' : 'markdown';
    const render = {
      spec: projectSpec, cofounder: (x: RichContext) => projectCofounder(x),
      stepwise: projectStepwise, interview: projectInterview, expert: projectExpert, critique: projectCritique,
    }[o.strategy];
    const changes = [
      `Approach: ${o.strategyName}`,
      ...(c.domain.key !== 'generic' ? [`Added what ${an(c.domain.label)} needs: features${c.domain.admin ? ', admin tools' : ''} and design goals`] : ['Added the features, design goals and plan a real product needs']),
      ...(c.region === 'india' ? ['Set it up for India: rupees, UPI and GST'] : c.region !== 'none' ? ['Set prices and rules for your market'] : []),
      ...(c.brand ? [`Treated ${c.brand} as inspiration, not something to copy`] : []),
      'Listed technologies as options, and left budget, brand and timeline for the AI to ask you',
    ];
    return { prompt: render(c, structure), changes };
  }
  const prompt = taskApproach(o.brief, o.strategy, o.intent, o.structure);
  return prompt ? { prompt, changes: [`Approach: ${o.strategyName}`, `Added ${o.strategy === 'interview' ? 'the questions to ask you first' : o.strategy === 'critique' ? 'a draft-and-critique checklist' : o.strategy === 'stepwise' ? 'clear phases' : 'what a great answer looks like'}`] } : undefined;
}
