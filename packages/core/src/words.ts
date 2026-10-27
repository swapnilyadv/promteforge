/**
 * Vocabulary for the offline spelling fixer: common English, plus the words people use when they ask an AI for
 * something (apps, business, study, work, food, India). Base forms; plurals and -ed/-ing forms are derived.
 * Roughly most common first, so when two corrections are equally close the more common word wins.
 */
export const COMMON_WORDS = `
the be to of and a in that have i it for not on with he as you do at this but his by from they we say her she or
an will my one all would there their what so up out if about who get which go me when make can like time no just
him know take people into year your good some could them see other than then now look only come its over think also
back after use two how our work first well way even new want because any these give day most us is are was were
been being has had does did done said made went gone got gotten took taken came seen saw knew known thought gave
given told found used put let should may might must shall need please thanks thank yes okay ok hello hi hey sorry
very really much many more less few lot lots little big small large long short high low great best better bad
worse worst right left same different own next last early late old young sure true false real full empty free
easy hard simple quick fast slow nice beautiful clean modern professional proper perfect clear important main
possible able ready open close closed public private local global special general specific common popular
personal social final whole each every both either neither such another enough quite rather almost always never
often sometimes usually already still yet again also too here where why while until before since though although
however therefore instead maybe perhaps actually basically exactly especially probably finally currently recently
today tomorrow yesterday tonight morning evening night week month weekend daily weekly monthly yearly hour minute
second moment now soon later ago once twice
one two three four five six seven eight nine ten eleven twelve twenty thirty forty fifty hundred thousand million
billion lakh crore half quarter double single number numbers
man woman men women child children boy girl baby kid kids family mother father mom dad mummy papa parent parents
brother sister son daughter husband wife friend friends team boss manager colleague client customer user users
member members owner partner founder student students teacher teachers doctor doctors patient nurse engineer
developer designer writer artist student person everyone someone anyone nobody everybody somebody
home house room office school college university class classroom hospital clinic shop store market restaurant
hotel kitchen city town village country world state street road place area location address india indian
delhi mumbai bangalore bengaluru pune hyderabad chennai kolkata london america american british europe
ahmedabad jaipur lucknow indore surat kochi goa nagpur noida gurgaon gurugram chandigarh bhopal patna nashik thane
mysore coimbatore vizag manchester dubai singapore toronto sydney paris berlin
thing things something anything nothing everything stuff part parts piece kind type types sort way ways side end
start beginning middle top bottom front inside outside
say tell ask answer reply call talk speak write read learn teach study understand explain describe show help
try start stop finish begin continue keep hold bring send receive buy sell pay spend save cost earn
build create make develop design plan prepare fix solve change improve update upgrade add remove delete edit
check test review compare choose pick select decide find search follow lead manage run handle organize
convert translate summarize summarise rewrite generate draft list suggest recommend give provide include
support offer share post upload download install setup launch publish deploy host connect integrate track
measure grow increase reduce book order deliver ship return cancel refund login logout register sign signup
work play watch listen eat drink cook sleep walk drive travel move live stay wait feel love hate enjoy believe
hope wish remember forget mean seem become happen allow avoid miss win lose fail pass meet join visit
idea ideas question questions problem problems issue issues solution solutions answer answers reason result
results example examples step steps process system systems method way plan plans goal goals task tasks job jobs
project projects product products service services feature features function functions option options choice
detail details information info data fact facts point points topic topics subject list lists table chart
report reports document documents file files page pages section sections note notes summary content article
articles blog blogs post posts story stories book books letter letters email emails message messages text
video videos photo photos image images picture pictures design designs color colour colors colours style
styles theme themes font logo brand brands name names title titles word words line lines sentence paragraph
language languages english hindi marathi tamil telugu bengali gujarati kannada malayalam punjabi urdu
money price prices cost costs budget fee fees salary income profit loss tax taxes gst invoice invoices bill
bills payment payments discount discounts offer offers coupon coupons deal deals rupee rupees dollar dollars
pound pounds euro euros cash card cards bank account accounts wallet loan loans interest investment
business businesses company companies startup startups brand market marketing sales sale customer customers
client clients order orders delivery deliveries shipping stock inventory supplier suppliers vendor vendors
seller sellers buyer buyers growth strategy strategies competitor competitors revenue funding investor pitch
website websites site sites web app apps application applications mobile phone phones laptop computer computers
software hardware platform platforms online offline internet network server servers cloud database databases
backend frontend api apis code coding program programming programmer script scripts bug bugs error errors
crash crashes fix fixes feature version versions release update updates login password passwords security
secure privacy safe safety admin dashboard dashboards panel panels profile profiles settings notification
notifications search filter filters sort cart checkout wishlist catalogue catalog category categories
review reviews rating ratings comment comments chat chats message inbox calendar schedule booking bookings
appointment appointments reminder reminders subscription subscriptions plan pricing tier tiers analytics
report tracking map maps location gps camera upload storage backup sync responsive layout screen screens
button buttons form forms field fields menu menus navigation header footer sidebar homepage landing
template templates component components frame framework frameworks library libraries tool tools plugin
plugins extension extensions browser chrome brave edge firefox safari android ios iphone windows mac linux
python javascript typescript java kotlin swift react angular vue next node express django flask fastapi
nestjs laravel php ruby rails golang rust html css tailwind bootstrap sql mysql postgres postgresql mongodb
firebase supabase redis docker kubernetes aws azure vercel netlify render railway github git json csv xml
excel sheet sheets spreadsheet pdf word powerpoint slides presentation presentations figma canva wordpress
shopify razorpay stripe paypal paytm phonepe upi gpay openai chatgpt claude gemini copilot cursor ollama
model models prompt prompts ai machine learning deep neural agent agents bot bots automation automate
ecommerce commerce clothing clothes fashion shoes shoe dress dresses shirt shirts jeans saree sarees kurta
jewellery jewelry cosmetics makeup skincare beauty salon spa gym fitness workout workouts exercise diet
health healthy medicine medical hospital doctor appointment yoga meditation weight sleep
food foods meal meals breakfast lunch dinner snack snacks recipe recipes cooking cook chef bakery cake cakes
bread coffee tea chai juice water milk rice dal roti chapati paratha dosa idli poha upma sambar biryani paneer
curry samosa pizza burger pasta sandwich salad fruit fruits vegetable vegetables chicken fish egg eggs
tiffin restaurant cafe hotel menu dish dishes kitchen grocery groceries
education course courses class classes lesson lessons tutorial tutorials exam exams test tests quiz quizzes
homework assignment assignments project thesis research paper papers essay essays notes syllabus subject
science math maths physics chemistry biology history geography economics commerce accounts finance law
resume cv interview interviews job jobs career hiring internship skills experience portfolio linkedin
event events wedding party birthday ticket tickets travel trip trips tour tours holiday holidays flight
flights train hotel booking visa passport property properties rent rental flat flats apartment house
social media instagram facebook youtube twitter whatsapp telegram tiktok reel reels channel channels
influencer followers caption captions hashtag hashtags content creator creators audience viewers subscribers
game games gaming player players level levels score puzzle
happy sad angry funny serious friendly polite firm formal informal casual short long detailed brief
creative unique attractive premium luxury cheap affordable expensive minimal elegant bold bright dark light
smart fast smooth secure reliable scalable flexible powerful useful helpful practical complete simple basic
advanced beginner beginners intermediate expert experts senior junior professional professionals
like such similar inspired based about around between among through across against without within upon
along behind below above under near far towards toward during per via
and or but nor so yet because although unless whether if then than as
what which who whom whose where when why how
i me my mine myself you your yours yourself he him his she her hers it its we us our ours they them their theirs
this that these those there here
am is are was were be been being do does did have has had will would shall should can could may might must
ok okay please thanks yes no not
broken heater landlord tenant repair repairs maintenance leave leaves sick manager meeting meetings deadline
deadlines urgent request requests approval approve complaint complaints feedback suggestion suggestions
compound interest earning earnings savings investing investment mutual fund funds stock stocks share shares
crypto bitcoin insurance retirement emergency expense expenses expensive cheaper
ideas idea brainstorm brainstorming outline summary summaries explanation explanations analysis analyse
analyze compare comparison difference differences pros cons advantages disadvantages benefits risks
kubernetes docker pandas numpy regex javascript typescript nextjs reactjs nodejs api webhook webhooks oauth
jwt cors https http url urls domain domains hosting deployment pipeline pipelines ci cd testing tests unit
component state props hook hooks useeffect usestate async await promise promises callback array arrays object
objects string strings integer boolean null undefined variable variables class classes method methods module
modules package packages import export error exception typeerror syntax bug debugging debug log logs
flipkart amazon myntra meesho nykaa swiggy zomato
sony canon nikon fujifilm gopro dell hp lenovo asus acer apple samsung xiaomi redmi oneplus realme oppo vivo
nokia motorola lg boat noise jbl bose sennheiser logitech intel amd nvidia qualcomm tesla toyota honda hyundai
maruti suzuki tata mahindra kia bmw audi mercedes nike adidas puma zara uniqlo ikea starbucks dominos mcdonalds
kfc airtel jio vodafone idea bsnl hdfc icici sbi axis kotak lic tcs infosys wipro hcl accenture deloitte
 uber ola airbnb netflix spotify notion slack trello zoom
etsy udemy coursera duolingo tinder practo oyo makemytrip bigbasket zepto blinkit upwork fiverr naukri
discord reddit pinterest snapchat bookmyshow dunzo cred groww zerodha byjus unacademy google microsoft apple
want wanted wants need needed needs make made makes build built builds create created creates

contact contacts gallery galleries photographer photographers photograph photography photographs portfolio
about services pricing testimonials testimonial faq faqs blog careers team terms policy policies refund returns
shipping tracking support help desk ticket tickets chatbot assistant assistants
account profile avatar upload uploads download downloads image gallery slider carousel banner banners hero
video player audio music song songs podcast podcasts playlist artist artists album albums movie movies film films
show shows series episode episodes news newsletter newsletters magazine article headline headlines
city cities state states country countries nation region regions district village villages area areas
north south east west centre center central nearby around near distance kilometre kilometer mile miles
member members membership memberships trainer trainers coach coaching coaches class classes session sessions
batch batches attendance progress streak streaks goal target targets habit habits routine routines
plan plans planner planning schedule scheduler reminder alerts alert notify notification notifications
easy easier easiest difficult harder hardest important importance interesting interested amazing awesome
excellent fantastic wonderful lovely cute cool fun funny boring exciting engaging catchy viral trending
quality value values price affordable premium budget cheap discount discounts sale offer offers deals
husband wife kids children parents grandparents relatives guests guest visitor visitors traveller travellers
tourist tourists passenger passengers driver drivers rider riders delivery partner partners agent agents
farmer farmers worker workers employee employees employer employers staff hr human resources payroll
leave leaves holiday vacation sick medical emergency permission request approval application applications
landlord tenant rent lease deposit owner flat society neighbour neighbor neighbours neighbors
repair repairs plumber electrician carpenter cleaner cleaning laundry maid service servicing
complaint complaints refund replacement warranty guarantee damaged damage broken missing late delay delayed
thank thanks grateful appreciate apology apologise apologize apologies regret
dear regards sincerely kindly respected sir madam team
explain explains explained explaining explanation describe description define definition meaning means
simple simply simpler easily clearly briefly quickly properly correctly exactly fully completely
step-by-step guide guides guideline guidelines tips tip tricks trick checklist checklists roadmap roadmaps
beginner beginners student students kids children adults adult everyone
history historical science scientific technology technical engineering medicine legal law laws rule rules
government policy election politics economy economic finance financial accounting tax taxes audit
climate weather environment environmental energy solar electric electricity water pollution
animal animals dog dogs cat cats pet pets bird birds plant plants tree trees garden gardening flower flowers
sport sports cricket football soccer tennis badminton chess running swimming cycling
car cars bike bikes bus buses train trains metro auto taxi cab cabs parking traffic
weekend weekday weekdays monday tuesday wednesday thursday friday saturday sunday
january february march april may june july august september october november december
morning afternoon evening night midnight noon daily weekly monthly
young old older elder elderly teen teenager teenagers college school schools university universities
graduate graduation degree degrees diploma certificate certificates certification exam exams board result
marks grade grades score scores percentage rank ranking topper
cook cooking recipe recipes kitchen ingredients ingredient spicy sweet salty healthy tasty delicious homemade
vegetarian vegan veg nonveg protein calories calorie nutrition nutritional
clothes outfit outfits size sizes colour colours fabric cotton silk wool design designer tailor
shop shops shopping store stores mall malls boutique showroom outlet online offline retail wholesale
order orders ordering ordered cart checkout pay paid paying payment payments upi wallet cod
review reviews rating ratings star stars feedback survey surveys poll polls form forms
login signup register registration otp verification verify email phone mobile number
fast faster fastest speed slow loading load performance optimize optimise optimization seo
responsive mobile-friendly accessible accessibility dark light mode theme themes animation animations
smooth simple clean minimalist minimal colorful colourful vibrant bright soft
todo todos to-do checklist kanban admin admins owner owners manager managers moderator moderators role roles permission permissions
report reports export exports import imports backup backups restore history logs log
mujhe muje mereko hume humein hamein ek banana banani banwana banwani hai hain ho hona jisme jismein aur
chahiye chaiye mera meri mere hamara hamari hamare ke ki ka liye kaise kya karna karo kar banao bana banado banade
jaise jese wala wali wale bhi nahi nahin sake apna apni apne yaar bhai ji accha achha sasta jaldi ya
`;

/**
 * The words that matter most in a request. A badly mangled one ("exomcmmer") is too far from any word for an
 * edit-distance match, so these are also matched by shared letters and letter pairs.
 */
export const KEY_TERMS = `ecommerce website application business restaurant appointment marketplace dashboard
subscription inventory payment delivery customer product platform management booking portfolio education
fitness analytics notification registration authentication recommendation development developer database
software startup landing catalogue checkout wishlist clothing grocery furniture jewellery cosmetics hospital
presentation assignment interview resume message prompt explain generate improve professional beautiful
features function problem solution strategy marketing instagram youtube facebook linkedin whatsapp flipkart
amazon python javascript typescript programming project create design write different something everything
information document photography university college teacher student`;

/** Brand names people mention, with their usual spelling. */
export const BRANDS = ['Flipkart', 'Amazon', 'Myntra', 'Meesho', 'Nykaa', 'Swiggy', 'Zomato', 'Uber', 'Ola', 'Airbnb', 'Netflix', 'Instagram', 'Twitter', 'LinkedIn', 'Spotify', 'YouTube', 'Notion', 'Slack', 'Trello', 'Zoom', 'WhatsApp', 'Paytm', 'PhonePe', 'Shopify', 'Etsy', 'Udemy', 'Coursera', 'Duolingo', 'Tinder', 'Practo', 'OYO', 'MakeMyTrip', 'BigBasket', 'Zepto', 'Blinkit', 'Upwork', 'Fiverr', 'Naukri', 'Canva', 'Figma', 'Stripe', 'Discord', 'Reddit', 'Pinterest', 'Snapchat', 'BookMyShow', 'Dunzo', 'Urban Company', 'Cred', 'Groww', 'Zerodha', "Byju's", 'Unacademy', 'Facebook', 'Google', 'ChatGPT', 'Razorpay'];

/** Cities people mention, with their usual spelling. */
export const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Bengaluru', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Indore', 'Surat', 'Kochi', 'Goa', 'Nagpur', 'Noida', 'Gurgaon', 'Gurugram', 'Chandigarh', 'Bhopal', 'Patna', 'Nashik', 'Thane', 'Mysore', 'Coimbatore', 'Vizag', 'London', 'Manchester', 'Dubai', 'Singapore', 'Toronto', 'Sydney', 'Paris', 'Berlin'];
