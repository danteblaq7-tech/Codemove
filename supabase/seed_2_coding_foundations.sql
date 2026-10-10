-- =====================================================================
-- CodeMove – course content seed
-- Courses created (all HIDDEN drafts, so nothing changes for learners until you publish):
--   Coding Foundations (Scratch, HTML and CSS)  [coding-foundations]
--
-- HOW TO RUN: Supabase → SQL Editor → paste this file → Run.
-- SAFE TO RE-RUN: a course whose slug already exists is skipped (your edits are never overwritten).
-- To reload a course from scratch, delete it in the app (or `delete from courses where slug = '...'`) and run the seed again.
-- Everything here is editable in the app afterwards (Admin → Add lessons / Quizzes, Teacher → Edit lessons).
--
-- BEFORE PUBLISHING: run find_todo_markers.sql. Lines marked [[VERIFY: ...]] need the client's confirmation,
-- and "Picture to be added" lines need images.
-- =====================================================================

-- ===== Coding Foundations (Scratch, HTML and CSS) (coding-foundations) =====
do $seed$
declare c uuid; m uuid; q uuid; qq uuid;
begin
  if exists (select 1 from courses where slug = 'coding-foundations') then
    raise notice 'Skipped: course "coding-foundations" already exists (nothing was changed).'; return;
  end if;
  insert into courses(title,slug,description,difficulty_level,is_published,total_lessons,total_quizzes,estimated_duration_minutes)
    values ($t$Coding Foundations (Scratch, HTML and CSS)$t$,'coding-foundations',$t$Learn what coding is, build with Scratch blocks, then write real HTML and CSS and make your own personal website. The HTML and CSS lessons run right here in the code editor.$t$,'beginner',false,23,4,350) returning id into c;
  insert into modules(course_id,title,description,order_index) values (c,$t$Part 1: Introduction to coding and Scratch$t$,$t$What coding is, the main programming languages, and the building blocks of Scratch.$t$,1) returning id into m;
  insert into lessons(module_id,title,content,code_example,tip_text,order_index,estimated_minutes) values
    (m,$t$Parts of a computer$t$,$t$<p><strong>🎯 Objective:</strong> Name the main parts of a computer and say what each one does.</p><p>Before we talk to a computer, let us meet its parts.</p><table><thead><tr><th>Part</th><th>What it does</th></tr></thead><tbody><tr><td>Input devices (keyboard, mouse)</td><td>Send information <strong>into</strong> the computer</td></tr><tr><td>Processor (CPU)</td><td>The brain. It follows instructions and does the calculations</td></tr><tr><td>Memory (RAM)</td><td>Holds what the computer is working on right now</td></tr><tr><td>Storage</td><td>Keeps your files and programs, even when the computer is off</td></tr><tr><td>Output devices (screen, speakers)</td><td>Show or play the results</td></tr></tbody></table><h3>Check yourself</h3><ul><li>Which part is the brain of the computer?</li><li>Is a mouse an input device or an output device?</li></ul><p><strong>[[VERIFY: The client notes only say "Explain parts of a computer and their functions". This table was drafted. Replace it with the client's own list if they have one.]]</strong></p>$t$,null,$t$Input goes in, the processor thinks, output comes out.$t$,1,10),
    (m,$t$What is coding?$t$,$t$<p><strong>🎯 Objective:</strong> Explain what coding is and name common programming languages.</p><p><strong>Coding</strong> means giving instructions to a computer in a language that it understands. Think of programming languages like spoken languages. The difference is that instead of talking to people, you are "talking" to a computer.</p><h3>Programming languages</h3><table><thead><tr><th>Language</th><th>What it is used for</th></tr></thead><tbody><tr><td>Scratch</td><td>A block-based language for making games and animations</td></tr><tr><td>HTML</td><td>Creating websites</td></tr><tr><td>CSS</td><td>Styling websites</td></tr><tr><td>Python</td><td>Designed to be easy to read and write (data analysis and AI)</td></tr><tr><td>JavaScript</td><td>Making websites interactive</td></tr><tr><td>Java</td><td>Creating Android apps</td></tr><tr><td>C++</td><td>Making games and performance-heavy apps</td></tr><tr><td>C#</td><td>Used with game engines like Unity</td></tr></tbody></table><p>In this course you will learn Scratch, HTML and CSS.</p><h3>Check yourself</h3><ul><li>Which language is used to style a website?</li><li>Which language is used to make games and animations with blocks?</li></ul>$t$,null,$t$Coding = giving a computer instructions it can understand.$t$,2,10),
    (m,$t$Scratch basics$t$,$t$<p><strong>🎯 Objective:</strong> Name the parts of the Scratch workspace.</p><p>Scratch is a block-based programming language used to create games and animations. You build programs by snapping blocks together.</p><h3>The parts of a Scratch project</h3><table><thead><tr><th>Part</th><th>What it is</th></tr></thead><tbody><tr><td>Sprites</td><td>The characters that perform actions</td></tr><tr><td>Stage</td><td>The background area where your project comes to life</td></tr><tr><td>Blocks</td><td>Puzzle-piece-shaped commands used to build code</td></tr><tr><td>Scripts</td><td>Stacks of connected blocks that tell a sprite or the stage what to do</td></tr><tr><td>Costumes</td><td>Change how a sprite looks</td></tr><tr><td>Backdrops</td><td>Change the stage to show different scenes</td></tr></tbody></table><p>Scratch runs on the Scratch website (scratch.mit.edu), so open it in a new tab to try things out.</p><h3>Your turn</h3><ol><li>Open Scratch in a new tab and click <strong>Create</strong>.</li><li>Find the stage, the sprite and the blocks area.</li><li>Click the sprite and look at its costumes.</li></ol>$t$,null,$t$A script is a stack of blocks. A sprite follows its script.$t$,3,12),
    (m,$t$Programming concepts$t$,$t$<p><strong>🎯 Objective:</strong> Explain the main ideas used in every program.</p><table><thead><tr><th>Idea</th><th>What it means</th><th>Example</th></tr></thead><tbody><tr><td>Sequence</td><td>The order the instructions run, from top to bottom</td><td>Move, then turn, then say hello</td></tr><tr><td>Events</td><td>The start of a script</td><td>when green flag clicked</td></tr><tr><td>Loops</td><td>Repeat blocks: a number of times, until something is true, or forever</td><td>repeat 10 / repeat until / forever</td></tr><tr><td>Conditionals</td><td>Run code only if something is true</td><td>if touching edge then bounce</td></tr><tr><td>Variables</td><td>Placeholders that store and update information</td><td>score, timer</td></tr><tr><td>Broadcasts</td><td>Messages that let sprites talk to each other</td><td>One sprite tells another to start dancing</td></tr><tr><td>Sensing</td><td>Detect what is happening around a sprite</td><td>touching a colour, a sprite or the mouse pointer</td></tr></tbody></table><h3>Check yourself</h3><ul><li>Which idea repeats blocks?</li><li>Which idea stores a game score?</li><li>Which idea lets one sprite send a message to another?</li></ul>$t$,null,$t$Sequence, events, loops, conditionals, variables, broadcasts, sensing.$t$,4,15),
    (m,$t$Scratch block categories$t$,$t$<p><strong>🎯 Objective:</strong> Recognise the block categories by colour and use them in a script.</p><table><thead><tr><th>Category</th><th>Colour</th><th>What the blocks do</th></tr></thead><tbody><tr><td>Motion</td><td>Blue</td><td>Move, rotate and position the sprite (x and y coordinates)</td></tr><tr><td>Looks</td><td>Purple</td><td>Appearance, costumes, backdrops, size, speech and thought bubbles</td></tr><tr><td>Sound</td><td>Magenta</td><td>Play sounds and control volume</td></tr><tr><td>Events</td><td>Yellow</td><td>Trigger scripts to start, for example "when green flag clicked"</td></tr><tr><td>Control</td><td>Orange / gold</td><td>Loops and waits that manage how the program flows</td></tr><tr><td>Sensing</td><td>Light blue</td><td>Detect touching, colours, mouse distance or key presses</td></tr><tr><td>Operators</td><td>Green</td><td>Maths, random numbers and comparisons</td></tr><tr><td>Variables</td><td>Dark orange</td><td>Store, update and use numbers or text</td></tr><tr><td>My Blocks</td><td>Pink</td><td>Make your own reusable blocks to keep code tidy</td></tr></tbody></table><h3>Your turn</h3><ol><li>In Scratch, drag <strong>when green flag clicked</strong> (Events) into the scripts area.</li><li>Add <strong>say Hello! for 2 seconds</strong> (Looks) underneath.</li><li>Add <strong>forever</strong> (Control) and put <strong>move 10 steps</strong> (Motion) inside it.</li><li>Click the green flag. What does your sprite do?</li></ol>$t$,null,$t$Events start the script. Control keeps it going.$t$,5,15);
  insert into quizzes(module_id,title,description,pass_score,total_questions) values (m,$t$Scratch and coding basics quiz$t$,$t$Check what you learned about coding and Scratch.$t$,70,8) returning id into q;
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$What is coding?$t$,'single',1) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$Typing very fast$t$,false,1),(qq,$t$Giving instructions to a computer in a language it understands$t$,true,2),(qq,$t$Drawing pictures on paper$t$,false,3),(qq,$t$Repairing computers$t$,false,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Which language is used to create websites?$t$,'single',2) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$Java$t$,false,1),(qq,$t$Scratch$t$,false,2),(qq,$t$HTML$t$,true,3),(qq,$t$C#$t$,false,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Which language is used to style websites?$t$,'single',3) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$Scratch$t$,false,1),(qq,$t$Python$t$,false,2),(qq,$t$HTML$t$,false,3),(qq,$t$CSS$t$,true,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$In Scratch, what are sprites?$t$,'single',4) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$The background area$t$,false,1),(qq,$t$The characters that perform actions$t$,true,2),(qq,$t$The sounds$t$,false,3),(qq,$t$The colours of the blocks$t$,false,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Which Scratch idea repeats a series of blocks?$t$,'single',5) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$Loops$t$,true,1),(qq,$t$Broadcasts$t$,false,2),(qq,$t$Sensing$t$,false,3),(qq,$t$Sequence$t$,false,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$A variable is used to:$t$,'single',6) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$Change the backdrop$t$,false,1),(qq,$t$Draw a sprite$t$,false,2),(qq,$t$Play a sound$t$,false,3),(qq,$t$Store and update information such as a score$t$,true,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Which block category is blue and moves the sprite?$t$,'single',7) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$Sound$t$,false,1),(qq,$t$Operators$t$,false,2),(qq,$t$Motion$t$,true,3),(qq,$t$Looks$t$,false,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Which Scratch idea lets one sprite send a message to another?$t$,'single',8) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$Sequence$t$,false,1),(qq,$t$Sensing$t$,false,2),(qq,$t$Broadcasts$t$,true,3),(qq,$t$Loops$t$,false,4);
  insert into modules(course_id,title,description,order_index) values (c,$t$Part 2: HTML (building web pages)$t$,$t$Build web pages with headings, paragraphs, images, lists, videos, forms and links, then make your own personal website.$t$,2) returning id into m;
  insert into lessons(module_id,title,content,code_example,tip_text,order_index,estimated_minutes) values
    (m,$t$What is HTML?$t$,$t$<p><strong>🎯 Objective:</strong> Say what HTML stands for and write your first web page.</p><p><strong>HTML</strong> stands for <strong>Hyper Text Markup Language</strong>. It is used to create and develop websites. A <strong>website</strong> is a collection of digital pages.</p><h3>Tags</h3><p>HTML is made of instructions called <strong>tags</strong>. A tag sits between angle brackets.</p><table><thead><tr><th>Symbol</th><th>Name</th></tr></thead><tbody><tr><td><code>&lt;</code></td><td>Opening angle bracket</td></tr><tr><td><code>&gt;</code></td><td>Closing angle bracket</td></tr><tr><td><code>/</code></td><td>Forward slash</td></tr><tr><td><code>&lt;p&gt;</code></td><td>An opening tag</td></tr><tr><td><code>&lt;/p&gt;</code></td><td>A closing tag</td></tr></tbody></table><p>Press the green <strong>Run</strong> button (▶) under the code to see your page.</p><h3>Your turn</h3><ol><li>Change the text inside <code>&lt;h1&gt;</code> to your own name.</li><li>Change the sentence inside <code>&lt;p&gt;</code>.</li><li>Run your page again.</li></ol>$t$,$t$<!-- Welcome to HTML! -->
<h1>Hello, world!</h1>
<p>This is my first web page.</p>$t$,$t$Most tags come in pairs: an opening tag <p> and a closing tag </p>.$t$,1,12),
    (m,$t$Headings$t$,$t$<p><strong>🎯 Objective:</strong> Use the six heading sizes to give your page a clear structure.</p><p>Headings are the titles and subtitles of a page. There are six: <code>&lt;h1&gt;</code> to <code>&lt;h6&gt;</code>. <code>&lt;h1&gt;</code> is the largest and <code>&lt;h6&gt;</code> is the smallest.</p><h3>Your turn</h3><ol><li>Run the page and compare the six sizes.</li><li>Add a new <code>&lt;h2&gt;</code> that says "About me".</li><li>Change the <code>&lt;h1&gt;</code> to the name of your page.</li></ol>$t$,$t$<h1>Heading 1 (largest)</h1>
<h2>Heading 2</h2>
<h3>Heading 3</h3>
<h4>Heading 4</h4>
<h5>Heading 5</h5>
<h6>Heading 6 (smallest)</h6>$t$,$t$Use one <h1> for the main title of the page.$t$,2,10),
    (m,$t$Paragraphs and line breaks$t$,$t$<p><strong>🎯 Objective:</strong> Write paragraphs and start a new line with the break tag.</p><p>A paragraph is a collection of sentences. Use <code>&lt;p&gt;</code> and <code>&lt;/p&gt;</code>, for example <code>&lt;p&gt;I love coding&lt;/p&gt;</code>.</p><p>The <code>&lt;br&gt;</code> tag is a <strong>line break</strong>. It is like pressing Enter on the keyboard to move to the next line. It is an <strong>empty tag</strong>, so it does not need a closing tag.</p><h3>Your turn</h3><ol><li>Write two paragraphs about your favourite food.</li><li>Use <code>&lt;br&gt;</code> to put each line of a short poem on its own line.</li></ol>$t$,$t$<h1>About me</h1>
<p>I love coding.</p>
<p>My favourite subject is:<br>robotics!</p>$t$,$t$<br> is an empty tag. It has no closing tag.$t$,3,10),
    (m,$t$Images$t$,$t$<p><strong>🎯 Objective:</strong> Add a picture to your page and use the alt text.</p><p>An image is an <strong>empty tag</strong>. The code is <code>&lt;img src=""&gt;</code>. The <code>src</code> tells the browser where the picture is. The <code>alt</code> text is shown when the picture does not appear, for example <code>&lt;img src="dog.jpg" alt="A dog"&gt;</code>.</p><h3>Steps</h3><ol><li>Type the image code.</li><li>Search for an image in a new tab.</li><li>Open the image.</li><li>Right-click the image and choose <strong>Copy image address</strong>.</li><li>Go back to your page and paste the address between the quotation marks (Ctrl + V).</li></ol><p>The sample below uses a placeholder picture from the internet. If the picture does not load, you will see the alt text instead, which is exactly what alt is for.</p><h3>Your turn</h3><ol><li>Replace the <code>src</code> address with a picture you found.</li><li>Change the <code>alt</code> text to describe your picture.</li></ol>$t$,$t$<h1>My picture</h1>
<img src="https://placehold.co/300x200?text=My+picture" alt="A grey box that says My picture">$t$,$t$Always add alt text. It describes the picture if it does not load.$t$,4,15),
    (m,$t$Lists$t$,$t$<p><strong>🎯 Objective:</strong> Make ordered and unordered lists.</p><p>Lists organise related items. Each item goes inside <code>&lt;li&gt;</code>.</p><table><thead><tr><th>List</th><th>Tag</th><th>Looks like</th></tr></thead><tbody><tr><td>Ordered</td><td><code>&lt;ol&gt;</code></td><td>Numbers or letters</td></tr><tr><td>Unordered</td><td><code>&lt;ul&gt;</code></td><td>Bullet points</td></tr></tbody></table><p>Type only the tags. The browser adds the numbers and bullets for you.</p><h3>Your turn</h3><ol><li>Add two more fruits to each list.</li><li>Make a list of your three favourite subjects.</li></ol>$t$,$t$<h2>Ordered list</h2>
<ol>
  <li>mangoes</li>
  <li>oranges</li>
  <li>bananas</li>
</ol>

<h2>Unordered list</h2>
<ul>
  <li>mangoes</li>
  <li>oranges</li>
  <li>bananas</li>
</ul>$t$,$t$ol = ordered (numbers). ul = unordered (bullets). li = list item.$t$,5,10),
    (m,$t$Videos$t$,$t$<p><strong>🎯 Objective:</strong> Embed a video on your page.</p><p>The code for a video is <code>&lt;iframe&gt;</code>. Videos need an internet connection to play.</p><h3>Steps</h3><ol><li>Open a new tab and go to YouTube.</li><li>Search for a video and open it.</li><li>Click <strong>Share</strong>, then <strong>Embed</strong>.</li><li>Copy the embed code.</li><li>Paste it into your page (Ctrl + V).</li></ol><h3>Your turn</h3><ol><li>Replace <code>VIDEO_ID</code> with the ID from your embed code, or paste the whole embed code in its place.</li></ol>$t$,$t$<h1>My favourite video</h1>
<iframe width="320" height="180"
  src="https://www.youtube.com/embed/VIDEO_ID"
  title="My video" allowfullscreen></iframe>$t$,$t$iframe embeds another page or video inside yours.$t$,6,12),
    (m,$t$Forms and input types$t$,$t$<p><strong>🎯 Objective:</strong> Build a form that collects information from a user.</p><p>A form asks the user for information. The <code>&lt;input&gt;</code> tag collects it, and its <code>type</code> says what kind of information.</p><table><thead><tr><th>Type</th><th>What it does</th></tr></thead><tbody><tr><td>text</td><td>One line of text</td></tr><tr><td>password</td><td>Hides what is typed</td></tr><tr><td>email</td><td>Needs a valid email address</td></tr><tr><td>number</td><td>Only numbers</td></tr><tr><td>date</td><td>Opens a date picker</td></tr><tr><td>checkbox</td><td>Choose one or more options</td></tr><tr><td>radio</td><td>Choose only one option from a group</td></tr><tr><td>submit</td><td>Sends the form</td></tr><tr><td>reset</td><td>Clears the form</td></tr><tr><td>file</td><td>Upload a file</td></tr><tr><td>color</td><td>Opens a colour picker</td></tr><tr><td>tel</td><td>A telephone number</td></tr></tbody></table><table><thead><tr><th>Helper tag</th><th>What it does</th></tr></thead><tbody><tr><td><code>&lt;fieldset&gt;</code></td><td>Draws a border around a group</td></tr><tr><td><code>&lt;legend&gt;</code></td><td>The title of the form</td></tr><tr><td><code>&lt;label&gt;</code></td><td>A label for an input</td></tr><tr><td><code>&lt;br&gt;</code></td><td>A line break</td></tr></tbody></table><h3>Your turn</h3><ol><li>Run the form and try each field.</li><li>Add a field asking for the learner's <strong>email</strong>.</li><li>Change the "Submit" button text.</li></ol>$t$,$t$<h1>ADMISSION FORM</h1>
<form>
  <fieldset>
    <legend>FILL THIS FORM</legend>

    <label>Name</label>
    <input type="text"><br>

    <p>Gender</p>
    <input type="radio" name="gender" id="male">
    <label for="male">Male</label>
    <input type="radio" name="gender" id="female">
    <label for="female">Female</label><br>

    <p>Subjects you like</p>
    <input type="checkbox" id="rob"> <label for="rob">Robotics</label>
    <input type="checkbox" id="cod"> <label for="cod">Coding</label><br><br>

    <input type="submit" value="Submit">
    <input type="reset" value="Clear">
  </fieldset>
</form>$t$,$t$Radio = pick one. Checkbox = pick any number.$t$,7,20),
    (m,$t$Hyperlinks$t$,$t$<p><strong>🎯 Objective:</strong> Create clickable links.</p><p>A hyperlink is a clickable link that takes you to another page or resource, like clicking a link on WhatsApp. It uses the <strong>anchor</strong> tag <code>&lt;a&gt;</code> and the <code>href</code> attribute, which says where the link goes. The words between the tags are the clickable text.</p><pre><code>&lt;a href="https://www.google.com"&gt;visit website&lt;/a&gt;</code></pre><table><thead><tr><th>Type of link</th><th>What it does</th></tr></thead><tbody><tr><td>External link</td><td>Goes to another website</td></tr><tr><td>Internal link</td><td>Goes to another page on the same site</td></tr><tr><td>Email link</td><td>Opens an email, for example <code>mailto:name@example.com</code></td></tr></tbody></table><h3>Your turn</h3><ol><li>Change the link text.</li><li>Add a link to a website you like.</li><li>Add an email link.</li></ol>$t$,$t$<h1>Useful links</h1>
<p><a href="https://www.google.com">Visit Google</a></p>
<p><a href="mailto:name@example.com">Email me</a></p>$t$,$t$href says where the link goes.$t$,8,12),
    (m,$t$Final project: my personal website$t$,$t$<p><strong>🎯 Objective:</strong> Combine everything you have learned into one themed personal website.</p><p>Choose a theme, such as my hobby, my school, my favourite animal or my dream robot. Your page should have:</p><ul><li>A main heading and at least two smaller headings</li><li>Paragraphs about your theme</li><li>At least one picture with alt text</li><li>A list</li><li>A video (optional)</li><li>A form (for example a feedback form)</li><li>At least one link</li></ul><p>Save often with the blue <strong>Save</strong> button. Your teacher can see your progress.</p><h3>Check yourself</h3><ul><li>Did you use more than one heading size?</li><li>Does every picture have alt text?</li><li>Does every opening tag have a closing tag?</li></ul>$t$,$t$<!-- My personal website. Replace the text with your own! -->
<h1>My Theme</h1>

<h2>About</h2>
<p>Write about your theme here.</p>

<h2>Picture</h2>
<img src="https://placehold.co/300x200?text=My+picture" alt="Describe your picture">

<h2>My list</h2>
<ul>
  <li>First thing</li>
  <li>Second thing</li>
</ul>

<h2>Contact</h2>
<p><a href="https://www.google.com">A useful link</a></p>$t$,$t$Plan first: what is your theme, and which elements will you use?$t$,9,30);
  insert into quizzes(module_id,title,description,pass_score,total_questions) values (m,$t$HTML quiz$t$,$t$Check what you learned about HTML.$t$,70,10) returning id into q;
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$What does HTML stand for?$t$,'single',1) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$Home Tool Markup Language$t$,false,1),(qq,$t$High Tech Modern Language$t$,false,2),(qq,$t$Hyper Transfer Mail Language$t$,false,3),(qq,$t$Hyper Text Markup Language$t$,true,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Which tag is the largest heading?$t$,'single',2) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$<head>$t$,false,1),(qq,$t$<h6>$t$,false,2),(qq,$t$<p>$t$,false,3),(qq,$t$<h1>$t$,true,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Which tag makes a paragraph?$t$,'single',3) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$<li>$t$,false,1),(qq,$t$<a>$t$,false,2),(qq,$t$<br>$t$,false,3),(qq,$t$<p>$t$,true,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Which tag inserts a line break and has no closing tag?$t$,'single',4) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$<form>$t$,false,1),(qq,$t$<ul>$t$,false,2),(qq,$t$<br>$t$,true,3),(qq,$t$<p>$t$,false,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$What is the alt attribute of an image used for?$t$,'single',5) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$To play a sound$t$,false,1),(qq,$t$Text shown if the image does not appear$t$,true,2),(qq,$t$To link to another page$t$,false,3),(qq,$t$To change the image size$t$,false,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Which tag makes an unordered (bullet) list?$t$,'single',6) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$<li>$t$,false,1),(qq,$t$<ul>$t$,true,2),(qq,$t$<p>$t$,false,3),(qq,$t$<ol>$t$,false,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Which input type lets the user choose only ONE option from a group?$t$,'single',7) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$text$t$,false,1),(qq,$t$checkbox$t$,false,2),(qq,$t$radio$t$,true,3),(qq,$t$password$t$,false,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Which input type hides what the user types?$t$,'single',8) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$number$t$,false,1),(qq,$t$password$t$,true,2),(qq,$t$email$t$,false,3),(qq,$t$text$t$,false,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Which attribute says where a hyperlink goes?$t$,'single',9) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$alt$t$,false,1),(qq,$t$href$t$,true,2),(qq,$t$type$t$,false,3),(qq,$t$src$t$,false,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Which tag is used to embed a video?$t$,'single',10) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$<iframe>$t$,true,1),(qq,$t$<video-link>$t$,false,2),(qq,$t$<br>$t$,false,3),(qq,$t$<img>$t$,false,4);
  insert into modules(course_id,title,description,order_index) values (c,$t$Part 3: CSS (making pages beautiful)$t$,$t$Style your pages with colours, fonts, spacing, borders, backgrounds and hover effects.$t$,3) returning id into m;
  insert into lessons(module_id,title,content,code_example,tip_text,order_index,estimated_minutes) values
    (m,$t$What is CSS?$t$,$t$<p><strong>🎯 Objective:</strong> Explain what CSS does and read a CSS rule.</p><p><strong>CSS</strong> stands for <strong>Cascading Style Sheets</strong>. It is the language that styles an HTML page and makes a website look beautiful. It describes how an element is displayed on the screen.</p><p>In this editor, CSS goes inside a <code>&lt;style&gt;</code> block at the top of your page.</p><h3>Parts of a CSS rule</h3><pre><code>h1 {
  color: purple;
  text-align: center;
}</code></pre><table><thead><tr><th>Part</th><th>What it is</th></tr></thead><tbody><tr><td>Selector</td><td>Chooses what to style, for example <code>h1</code> or <code>p</code></td></tr><tr><td>Curly braces <code>{ }</code></td><td>Show where the styling rules begin and end</td></tr><tr><td>Property</td><td>What you want to change, for example <code>color</code></td></tr><tr><td>Value</td><td>How you want to change it, for example <code>purple</code></td></tr><tr><td>Declaration</td><td>A property and its value, joined by a colon and ended with a semicolon</td></tr></tbody></table><h3>Your turn</h3><ol><li>Change the colour of the heading.</li><li>Change <code>center</code> to <code>left</code> or <code>right</code>.</li></ol>$t$,$t$<style>
  h1 {
    color: purple;
    text-align: center;
  }
</style>

<h1>Hello CSS</h1>
<p>This paragraph is not styled yet.</p>$t$,$t$Selector { property: value; }$t$,1,15),
    (m,$t$Styling text$t$,$t$<p><strong>🎯 Objective:</strong> Change the colour, size, font and style of text.</p><table><thead><tr><th>Property</th><th>What it does</th></tr></thead><tbody><tr><td><code>color</code></td><td>Text colour</td></tr><tr><td><code>font-size</code></td><td>Size of the text</td></tr><tr><td><code>font-family</code></td><td>Style of font, such as serif, Arial, cursive, monospace, Georgia, fantasy</td></tr><tr><td><code>font-weight</code></td><td>Thickness: normal, bold, lighter, bolder</td></tr><tr><td><code>font-style</code></td><td>normal, italic, oblique</td></tr><tr><td><code>text-align</code></td><td>left, right, center</td></tr><tr><td><code>text-decoration</code></td><td>Adds or removes an underline</td></tr><tr><td><code>text-transform</code></td><td>For example uppercase</td></tr><tr><td><code>letter-spacing</code></td><td>Space between letters</td></tr><tr><td><code>text-shadow</code></td><td>Adds a shadow behind the text</td></tr></tbody></table><h3>Your turn</h3><ol><li>Add <code>font-style: italic;</code> to the paragraph.</li><li>Add <code>letter-spacing: 3px;</code> to the heading.</li><li>Try a different <code>font-family</code>.</li></ol>$t$,$t$<style>
  h1 {
    color: purple;
    font-size: 40px;
    font-family: Georgia;
    text-transform: uppercase;
    text-shadow: 2px 2px 4px gray;
  }
  p {
    color: blue;
    font-size: 18px;
    font-weight: bold;
  }
</style>

<h1>Styled text</h1>
<p>Change me!</p>$t$,$t$Remember the semicolon at the end of every declaration.$t$,2,20),
    (m,$t$Space and borders (the box)$t$,$t$<p><strong>🎯 Objective:</strong> Use margin, padding, border, size and rounded corners.</p><table><thead><tr><th>Property</th><th>What it does</th></tr></thead><tbody><tr><td><code>margin</code></td><td>Space <strong>outside</strong> the element, pushing it away from others</td></tr><tr><td><code>padding</code></td><td>Space <strong>inside</strong> the element, between the border and the content</td></tr><tr><td><code>border</code></td><td>A line around the element, for example <code>3px solid red</code></td></tr><tr><td><code>width</code> and <code>height</code></td><td>How wide or tall the element is</td></tr><tr><td><code>border-radius</code></td><td>Rounds the corners, for example <code>10px</code></td></tr><tr><td><code>background-color</code></td><td>The background colour</td></tr></tbody></table><p>A border needs three things: a size, a style and a colour, for example <code>border: 2px solid blue;</code>.</p><h3>Your turn</h3><ol><li>Increase the padding to 30px.</li><li>Change the border colour.</li><li>Make the corners rounder.</li></ol>$t$,$t$<style>
  p {
    background-color: lightyellow;
    border: 3px solid green;
    border-radius: 10px;
    padding: 15px;
    margin: 20px;
    width: 300px;
  }
</style>

<p>I am a styled box.</p>$t$,$t$margin = outside. padding = inside.$t$,3,20),
    (m,$t$Backgrounds$t$,$t$<p><strong>🎯 Objective:</strong> Add a background image and control how it repeats and scales.</p><table><thead><tr><th>Property</th><th>What it does</th></tr></thead><tbody><tr><td><code>background-image</code></td><td>Adds an image to the background</td></tr><tr><td><code>background-repeat</code></td><td>Stops the image repeating when set to <code>no-repeat</code></td></tr><tr><td><code>background-size</code></td><td>Scales the image, for example <code>cover</code></td></tr></tbody></table><h3>Your turn</h3><ol><li>Change <code>background-color</code> to see the fallback.</li><li>Change <code>no-repeat</code> to <code>repeat</code>. What happens?</li></ol>$t$,$t$<style>
  body {
    background-color: lightblue;
    background-image: url("https://placehold.co/600x400?text=Background");
    background-repeat: no-repeat;
    background-size: cover;
  }
  h1 { color: white; text-align: center; }
</style>

<h1>My background</h1>$t$,$t$no-repeat stops the picture from tiling.$t$,4,12),
    (m,$t$Styling headings and paragraphs$t$,$t$<p><strong>🎯 Objective:</strong> Style several elements at once and give your text breathing space.</p><p>You can style as many selectors as you like. Use <code>line-height</code> for the space between lines of a paragraph.</p><h3>Your turn</h3><ol><li>Change the paragraph background colour.</li><li>Make the heading <code>uppercase</code>.</li><li>Change <code>line-height</code> to 2.</li></ol>$t$,$t$<style>
  h1 {
    color: purple;
    text-align: center;
    text-transform: uppercase;
    font-family: Arial;
    font-size: 30px;
  }
  p {
    color: blue;
    font-size: 16px;
    line-height: 1.5;
    background-color: lightgreen;
    padding: 10px;
    border-radius: 8px;
  }
</style>

<h1>Welcome to my page</h1>
<p>This paragraph has a background, padding and rounded corners.</p>$t$,$t$line-height controls the space between lines.$t$,5,15),
    (m,$t$Styling images and videos$t$,$t$<p><strong>🎯 Objective:</strong> Control the size and look of images and videos, and add a hover effect.</p><p>The <code>:hover</code> effect styles an element when the mouse pointer moves over it. Here, the image fades slightly when you hover.</p><h3>Your turn</h3><ol><li>Hover over the picture to see the effect.</li><li>Change the <code>border-radius</code> to make the picture round.</li><li>Change the <code>opacity</code> value.</li></ol>$t$,$t$<style>
  img {
    width: 300px;
    height: 200px;
    border: 3px solid gold;
    border-radius: 20px;
    display: block;
    margin: 10px auto;
  }
  img:hover {
    opacity: 0.8;
  }
</style>

<img src="https://placehold.co/300x200?text=Hover+me" alt="A grey box that says Hover me">$t$,$t$opacity: 1 is solid. Lower numbers are more see-through.$t$,6,15),
    (m,$t$Styling lists and links$t$,$t$<p><strong>🎯 Objective:</strong> Style lists and hyperlinks.</p><p>Use <code>list-style-type</code> to change bullets or numbers, for example <code>upper-roman</code>. Links are styled with the <code>a</code> selector. <code>text-decoration: none</code> removes the underline.</p><h3>Your turn</h3><ol><li>Change <code>upper-roman</code> to <code>lower-alpha</code>.</li><li>Change the link colour on hover.</li></ol>$t$,$t$<style>
  ol {
    list-style-type: upper-roman;
  }
  li {
    background-color: lavender;
    color: navy;
    padding: 10px;
    margin: 5px 0;
    border-radius: 5px;
  }
  a {
    color: white;
    background-color: green;
    text-decoration: none;
    padding: 5px 10px;
    border-radius: 5px;
  }
  a:hover {
    background-color: darkgreen;
  }
</style>

<ol>
  <li>Mangoes</li>
  <li>Oranges</li>
  <li>Bananas</li>
</ol>
<a href="https://www.google.com">Visit website</a>$t$,$t$a:hover styles a link when the mouse is over it.$t$,7,15),
    (m,$t$Styling forms$t$,$t$<p><strong>🎯 Objective:</strong> Style input boxes and buttons using attribute selectors.</p><p>To style one kind of input, put the type in square brackets, for example <code>input[type="text"]</code>. Remember the closing quote and bracket.</p><h3>Your turn</h3><ol><li>Change the border colour of the email box.</li><li>Make the button change colour when you hover over it.</li></ol>$t$,$t$<style>
  input {
    padding: 10px;
    margin: 5px 0;
    border: 2px solid gray;
    border-radius: 5px;
  }
  input[type="text"] { border-color: green; }
  input[type="email"] { border-color: blue; }
  input[type="password"] { border-color: purple; }
  input[type="submit"] {
    background-color: gold;
    border: none;
    cursor: pointer;
  }
  input[type="submit"]:hover {
    background-color: orange;
  }
</style>

<form>
  <input type="text" placeholder="Name"><br>
  <input type="email" placeholder="Email"><br>
  <input type="password" placeholder="Password"><br>
  <input type="submit" value="Send">
</form>$t$,$t$input[type="text"] styles only text boxes.$t$,8,15),
    (m,$t$Final project: style my website$t$,$t$<p><strong>🎯 Objective:</strong> Style the personal website you built in the HTML part of this course.</p><p>Paste your finished HTML into the editor and add a <code>&lt;style&gt;</code> block at the top. Your styled page should have:</p><ul><li>A background colour or image</li><li>A styled heading and paragraphs</li><li>A styled list</li><li>A picture with a border and rounded corners</li><li>A link that changes on hover</li><li>A styled form (if you built one)</li></ul><h3>Check yourself</h3><ul><li>Is your text easy to read against its background?</li><li>Did you keep the same colours across the whole page?</li></ul>$t$,$t$<style>
  body { background-color: lightyellow; font-family: Arial; }
  h1 { color: purple; text-align: center; }
  h2 { color: teal; }
  p { line-height: 1.5; }
</style>

<!-- Paste your personal website below this line -->
<h1>My Theme</h1>
<h2>About</h2>
<p>Write about your theme here.</p>$t$,$t$Pick two or three colours and stick to them.$t$,9,30);
  insert into quizzes(module_id,title,description,pass_score,total_questions) values (m,$t$CSS quiz$t$,$t$Check what you learned about CSS.$t$,70,10) returning id into q;
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$What does CSS stand for?$t$,'single',1) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$Creative Style System$t$,false,1),(qq,$t$Cascading Style Sheets$t$,true,2),(qq,$t$Computer Style Sheets$t$,false,3),(qq,$t$Colourful Style Syntax$t$,false,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$In the rule h1 { color: red; }, what is "h1"?$t$,'single',2) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$The declaration$t$,false,1),(qq,$t$The selector$t$,true,2),(qq,$t$The value$t$,false,3),(qq,$t$The property$t$,false,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$In the same rule, what is "color"?$t$,'single',3) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$The brace$t$,false,1),(qq,$t$The property$t$,true,2),(qq,$t$The value$t$,false,3),(qq,$t$The selector$t$,false,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Which symbols mark where a set of CSS rules begins and ends?$t$,'single',4) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$Square brackets [ ]$t$,false,1),(qq,$t$Round brackets ( )$t$,false,2),(qq,$t$Angle brackets < >$t$,false,3),(qq,$t$Curly braces { }$t$,true,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Which property adds space INSIDE an element, between the border and the content?$t$,'single',5) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$padding$t$,true,1),(qq,$t$width$t$,false,2),(qq,$t$border$t$,false,3),(qq,$t$margin$t$,false,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Which property adds space OUTSIDE an element?$t$,'single',6) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$border-radius$t$,false,1),(qq,$t$margin$t$,true,2),(qq,$t$padding$t$,false,3),(qq,$t$font-size$t$,false,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Which property rounds the corners of an element?$t$,'single',7) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$line-height$t$,false,1),(qq,$t$border-radius$t$,true,2),(qq,$t$letter-spacing$t$,false,3),(qq,$t$text-align$t$,false,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Which line makes a correct blue border?$t$,'single',8) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$border = blue;$t$,false,1),(qq,$t$border: 2px blue;$t$,false,2),(qq,$t$border: 2px solid blue;$t$,true,3),(qq,$t$border: solid;$t$,false,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Which selector styles only text input boxes?$t$,'single',9) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$text { }$t$,false,1),(qq,$t$type[input] { }$t$,false,2),(qq,$t$input[type="text"] { }$t$,true,3),(qq,$t$input.text { }$t$,false,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Which effect styles an element when the mouse pointer is over it?$t$,'single',10) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$:click$t$,false,1),(qq,$t$:point$t$,false,2),(qq,$t$:hover$t$,true,3),(qq,$t$:over$t$,false,4);
  insert into quizzes(module_id,title,description,pass_score,total_questions) values (m,$t$Coding Foundations: final check$t$,$t$A mixed check on Scratch, HTML and CSS.$t$,70,12) returning id into q;
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Which of these is a block-based language?$t$,'single',1) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$HTML$t$,false,1),(qq,$t$CSS$t$,false,2),(qq,$t$Scratch$t$,true,3),(qq,$t$C++$t$,false,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$What do loops do in Scratch?$t$,'single',2) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$Change the backdrop$t$,false,1),(qq,$t$Play sounds$t$,false,2),(qq,$t$Repeat blocks$t$,true,3),(qq,$t$Store scores$t$,false,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Which HTML tag creates a hyperlink?$t$,'single',3) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$<url>$t$,false,1),(qq,$t$<a>$t$,true,2),(qq,$t$<link>$t$,false,3),(qq,$t$<href>$t$,false,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Which tag makes the smallest heading?$t$,'single',4) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$<h6>$t$,true,1),(qq,$t$<h1>$t$,false,2),(qq,$t$<small>$t$,false,3),(qq,$t$<h3>$t$,false,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Which HTML tag creates a list item?$t$,'single',5) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$<item>$t$,false,1),(qq,$t$<ul>$t$,false,2),(qq,$t$<li>$t$,true,3),(qq,$t$<ol>$t$,false,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$What goes inside src="" in an image tag?$t$,'single',6) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$A description of the picture$t$,false,1),(qq,$t$The address of the picture$t$,true,2),(qq,$t$The size of the picture$t$,false,3),(qq,$t$The colour of the picture$t$,false,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Which language styles a web page?$t$,'single',7) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$Scratch$t$,false,1),(qq,$t$Java$t$,false,2),(qq,$t$HTML$t$,false,3),(qq,$t$CSS$t$,true,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Which CSS property changes the text colour?$t$,'single',8) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$color$t$,true,1),(qq,$t$font-style$t$,false,2),(qq,$t$background$t$,false,3),(qq,$t$text-align$t$,false,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Which CSS property makes text bold?$t$,'single',9) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$text-decoration$t$,false,1),(qq,$t$font-style$t$,false,2),(qq,$t$letter-spacing$t$,false,3),(qq,$t$font-weight$t$,true,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Where does CSS go in the app editor?$t$,'single',10) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$Inside a <style> block$t$,true,1),(qq,$t$Inside <br>$t$,false,2),(qq,$t$Inside <p>$t$,false,3),(qq,$t$It cannot be used$t$,false,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Which input type should you use for "choose only one"?$t$,'single',11) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$file$t$,false,1),(qq,$t$radio$t$,true,2),(qq,$t$checkbox$t$,false,3),(qq,$t$text$t$,false,4);
  insert into quiz_questions(quiz_id,question_text,question_type,order_index) values (q,$t$Which property controls the space between lines of a paragraph?$t$,'single',12) returning id into qq;
  insert into quiz_options(question_id,option_text,is_correct,order_index) values (qq,$t$line-height$t$,true,1),(qq,$t$border$t$,false,2),(qq,$t$letter-spacing$t$,false,3),(qq,$t$margin$t$,false,4);
end $seed$;
