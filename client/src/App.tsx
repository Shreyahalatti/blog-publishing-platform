import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, ChevronDown, Clock3, Feather,
  Heart, LogOut, Menu, MessageCircle, PenLine, Plus, Search, Send, Sparkles, X,
} from "lucide-react";
import { Comment, Post, request } from "./api";
import { useAuth } from "./auth";

const categories = ["All stories", "Design", "Culture", "Technology", "Life", "Writing"];
const todayLabel = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" })
  .format(new Date()).toUpperCase();
const suggestions = [
  { name: "Maya Chen", field: "Design & daily rituals", initials: "MC", color: "sage" },
  { name: "Theo Williams", field: "Culture & the internet", initials: "TW", color: "clay" },
  { name: "Amara Okafor", field: "Slow living, loudly", initials: "AO", color: "lilac" },
];

type PostForm = { title: string; excerpt: string; content: string; category: string; coverImage: string };
const emptyForm: PostForm = { title: "", excerpt: "", content: "", category: "Writing", coverImage: "" };

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function relativeDate(date: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(date));
}

function readingTime(content: string) {
  return `${Math.max(1, Math.ceil(content.split(/\s+/).length / 220))} min read`;
}

function CoverArt({ post, featured = false }: { post: Post; featured?: boolean }) {
  return (
    <div className={`cover-art cover-${post.category.toLowerCase()} ${featured ? "cover-featured" : ""}`}>
      {post.coverImage ? <img src={post.coverImage} alt="" /> : (
        <>
          <span className="cover-orbit orbit-one" />
          <span className="cover-orbit orbit-two" />
          <span className="cover-shape" />
          <span className="cover-caption">{post.category}</span>
        </>
      )}
    </div>
  );
}

function AuthDialog({ onClose }: { onClose: () => void }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") await signUp(name, email, password);
      else await signIn(email, password);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign you in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog auth-dialog">
        <button className="icon-button dialog-close" onClick={onClose} aria-label="Close"><X size={19} /></button>
        <div className="dialog-mark"><Feather size={23} /></div>
        <p className="eyebrow">A little space to think</p>
        <h2>{mode === "signup" ? "Find your people." : "Welcome back."}</h2>
        <p className="dialog-subtitle">{mode === "signup" ? "Create an account and start sharing your stories." : "Your next good read is waiting."}</p>
        <form className="form-stack" onSubmit={submit}>
          {mode === "signup" && <label>Your name<input required minLength={2} maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder="What should we call you?" /></label>}
          <label>Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" /></label>
          <label>Password<input required type="password" minLength={8} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete={mode === "signup" ? "new-password" : "current-password"} /></label>
          {error && <p className="form-error">{error}</p>}
          <button className="button button-dark button-full" disabled={busy}>{busy ? "One moment…" : mode === "signup" ? "Create your account" : "Sign in"}<ArrowRight size={16} /></button>
        </form>
        <p className="switch-mode">{mode === "signup" ? "Already have an account?" : "New to Inkwell?"} <button onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); }}>{mode === "signup" ? "Sign in" : "Create an account"}</button></p>
      </section>
    </div>
  );
}

function EditorDialog({ post, onClose, onSaved }: { post: Post | null; onClose: () => void; onSaved: (post: Post) => void }) {
  const [form, setForm] = useState<PostForm>(post ? {
    title: post.title, excerpt: post.excerpt, content: post.content,
    category: post.category, coverImage: post.coverImage ?? "",
  } : emptyForm);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function update(field: keyof PostForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await request<{ post: Post }>(post ? `/posts/${post.id}` : "/posts", {
        method: post ? "PATCH" : "POST",
        body: JSON.stringify(form),
      });
      onSaved(result.post);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your story could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay editor-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog editor-dialog">
        <div className="editor-top"><div><span className="eyebrow">YOUR NOTEBOOK</span><h2>{post ? "Edit your story" : "A story of your own"}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div>
        <p className="editor-note">Good writing starts wherever you are. You can polish it later.</p>
        <form className="form-stack" onSubmit={submit}>
          <label>Title<input required minLength={5} maxLength={120} value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Give your story a title" /></label>
          <label>A short introduction<input required minLength={10} maxLength={280} value={form.excerpt} onChange={(event) => update("excerpt", event.target.value)} placeholder="What will readers take away?" /></label>
          <div className="form-row"><label>Topic<select value={form.category} onChange={(event) => update("category", event.target.value)}>{categories.filter((item) => item !== "All stories").map((item) => <option key={item}>{item}</option>)}</select></label><label>Cover image URL <span className="optional">(optional)</span><input type="url" value={form.coverImage} onChange={(event) => update("coverImage", event.target.value)} placeholder="https://…" /></label></div>
          <label>Your story<textarea required minLength={30} maxLength={50000} rows={9} value={form.content} onChange={(event) => update("content", event.target.value)} placeholder="Let the first sentence be imperfect…" /></label>
          {error && <p className="form-error">{error}</p>}
          <div className="editor-actions"><span>Stories are published when you save.</span><button className="button button-dark" disabled={busy}>{busy ? "Saving…" : "Publish story"}<ArrowRight size={16} /></button></div>
        </form>
      </section>
    </div>
  );
}

function StoryCard({ post, onOpen, featured = false }: { post: Post; onOpen: (post: Post) => void; featured?: boolean }) {
  return (
    <article className={`story-card ${featured ? "story-card-featured" : ""}`} onClick={() => onOpen(post)} tabIndex={0} onKeyDown={(event) => event.key === "Enter" && onOpen(post)}>
      <CoverArt post={post} featured={featured} />
      <div className="story-copy">
        <div className="story-meta"><span className="category-label">{post.category}</span><span className="meta-dot">·</span><span>{readingTime(post.content)}</span></div>
        <h3>{post.title}</h3>
        <p>{post.excerpt}</p>
        <div className="story-footer"><div className="author-chip"><span className={`avatar avatar-${post.author.id.charCodeAt(0) % 4}`}>{initials(post.author.name)}</span><span>{post.author.name}</span></div><span className="story-date">{relativeDate(post.createdAt)}</span></div>
      </div>
    </article>
  );
}

export default function App() {
  const { user, signOut } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All stories");
  const [selected, setSelected] = useState<Post | null>(null);
  const [dialog, setDialog] = useState<"auth" | "editor" | null>(null);
  const [editing, setEditing] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState("");
  const [notice, setNotice] = useState("");
  const [feedError, setFeedError] = useState("");
  const [loading, setLoading] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);
  const latestFetch = useRef(0);

  const fetchPosts = useCallback(async () => {
    const fetchId = ++latestFetch.current;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (activeCategory !== "All stories") params.set("category", activeCategory);
      const result = await request<{ posts: Post[] }>(`/posts?${params.toString()}`);
      if (fetchId !== latestFetch.current) return;
      setPosts(result.posts);
      setFeedError("");
    } catch (cause) {
      if (fetchId !== latestFetch.current) return;
      setPosts([]);
      setFeedError(cause instanceof Error ? cause.message : "Could not load stories.");
    } finally {
      if (fetchId === latestFetch.current) setLoading(false);
    }
  }, [query, activeCategory]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void fetchPosts(), query ? 250 : 0);
    return () => window.clearTimeout(timeout);
  }, [fetchPosts, query]);

  const openPost = async (post: Post) => {
    try {
      const result = await request<{ post: Post }>(`/posts/${post.id}`);
      setSelected(result.post);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Could not open this story.");
    }
  };

  const featured = useMemo(() => posts[0], [posts]);
  const remainingPosts = useMemo(() => posts.slice(featured ? 1 : 0), [posts, featured]);

  async function addComment(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    try {
      const result = await request<{ comment: Comment }>(`/posts/${selected.id}/comments`, {
        method: "POST", body: JSON.stringify({ content: commentText }),
      });
      setSelected((current) => current ? { ...current, comments: [...(current.comments ?? []), result.comment], _count: { comments: (current._count?.comments ?? 0) + 1 } } : current);
      setCommentText("");
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Your comment could not be added.");
    }
  }

  function startWriting() {
    if (!user) {
      setDialog("auth");
      return;
    }
    setEditing(null);
    setDialog("editor");
  }

  async function removePost(post: Post) {
    if (!window.confirm("Delete this story and its comments? This can't be undone.")) return;
    try {
      await request<void>(`/posts/${post.id}`, { method: "DELETE" });
      setSelected(null);
      await fetchPosts();
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Story could not be deleted.");
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setSelected(null); }}><span className="brand-mark"><Feather size={20} /></span><span>inkwell<span className="brand-period">.</span></span></a>
        <div className="topbar-search"><Search size={17} /><input aria-label="Search stories" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search stories, topics, people…" /><kbd>⌘ K</kbd></div>
        <nav className="topbar-actions">
          <button className="write-link" onClick={startWriting}><PenLine size={16} /><span>Write</span></button>
          {user ? <div className="user-menu"><span className="avatar avatar-user">{initials(user.name)}</span><span className="user-name">{user.name.split(" ")[0]}</span><button className="icon-button logout-button" aria-label="Sign out" onClick={signOut}><LogOut size={16} /></button></div> : <button className="button button-dark sign-in-button" onClick={() => setDialog("auth")}>Sign in <ArrowRight size={15} /></button>}
          <button className="icon-button mobile-menu-button" aria-label="Toggle menu" onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X size={20} /> : <Menu size={20} />}</button>
        </nav>
      </header>

      <div className={`mobile-dropdown ${mobileMenu ? "is-open" : ""}`}>
        <button onClick={startWriting}><PenLine size={16} /> Write a story</button>
        {user ? <button onClick={signOut}><LogOut size={16} /> Sign out</button> : <button onClick={() => setDialog("auth")}>Sign in / Join Inkwell</button>}
      </div>

      <main className="layout">
        <aside className="sidebar">
          <div className="sidebar-block"><p className="sidebar-heading">YOUR DAILY READ</p><button className="sidebar-link sidebar-link-active" onClick={() => { setSelected(null); setActiveCategory("All stories"); }}><Sparkles size={17} /> For you <span className="tiny-indicator" /></button></div>
          <div className="sidebar-block topic-block"><p className="sidebar-heading">EXPLORE TOPICS</p>{categories.map((category) => <button key={category} className={`sidebar-link ${activeCategory === category ? "topic-active" : ""}`} onClick={() => { setActiveCategory(category); setSelected(null); }}><span className={`topic-dot dot-${category.toLowerCase().replace(" ", "-")}`} />{category}</button>)}</div>
          <div className="sidebar-prompt"><div className="prompt-icon"><Feather size={17} /></div><p>Everyone has a story.</p><span>Yours deserves a page.</span><button onClick={startWriting}>Start writing <ArrowRight size={14} /></button></div>
          <div className="sidebar-bottom"><a href="#about">About</a><a href="#guidelines">Guidelines</a><span>© Inkwell 2025</span></div>
        </aside>

        <section className="feed">
          {selected ? (
            <article className="article-view">
              <button className="back-link" onClick={() => setSelected(null)}><ArrowLeft size={16} /> Back to stories</button>
              <div className="article-heading"><span className="category-label">{selected.category}</span><h1>{selected.title}</h1><p className="article-excerpt">{selected.excerpt}</p><div className="article-byline"><span className="avatar avatar-large">{initials(selected.author.name)}</span><div><strong>{selected.author.name}</strong><span>{relativeDate(selected.createdAt)} <i>·</i> {readingTime(selected.content)}</span></div>{user?.id === selected.author.id && <div className="article-owner-actions"><button className="quiet-button" onClick={() => { setEditing(selected); setDialog("editor"); }}>Edit</button><button className="quiet-button danger-text" onClick={() => void removePost(selected)}>Delete</button></div>}</div></div>
              <CoverArt post={selected} featured />
              <div className="article-body">{selected.content.split(/\n{2,}/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
              <div className="article-reaction"><span><Heart size={17} /> A thoughtful read?</span><span><MessageCircle size={17} /> {selected.comments?.length ?? 0} responses</span></div>
              <section className="comments-section"><div className="comments-heading"><div><span className="eyebrow">THE CONVERSATION</span><h2>Responses <span>{selected.comments?.length ?? 0}</span></h2></div><ChevronDown size={18} /></div>
                {user ? <form className="comment-form" onSubmit={addComment}><span className="avatar">{initials(user.name)}</span><textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Add something thoughtful to the conversation…" minLength={2} maxLength={2000} required /><button className="send-comment" aria-label="Send response" disabled={commentText.trim().length < 2}><Send size={17} /></button></form> : <button className="comment-signin" onClick={() => setDialog("auth")}>Sign in to join the conversation <ArrowRight size={15} /></button>}
                <div className="comment-list">{(selected.comments ?? []).map((comment) => <div className="comment-item" key={comment.id}><span className={`avatar avatar-${comment.author.id.charCodeAt(0) % 4}`}>{initials(comment.author.name)}</span><div><div className="comment-meta"><strong>{comment.author.name}</strong><time>{relativeDate(comment.createdAt)}</time></div><p>{comment.content}</p></div></div>)}{!selected.comments?.length && <p className="empty-comments">No responses yet. Be the first to share a thought.</p>}</div>
              </section>
            </article>
          ) : (
            <>
              <div className="feed-welcome"><div><p className="eyebrow"><span className="live-dot" /> {todayLabel}</p><h1>A good story<br /><em>stays with you.</em></h1><p className="welcome-copy">Ideas, observations, and little things worth passing along.</p></div><div className="welcome-illustration"><div className="sun-shape" /><div className="book-shape"><span /><span /><span /></div><div className="sparkle sparkle-one">✳</div><div className="sparkle sparkle-two">✳</div></div></div>
              {notice && <div className="notice"><span>{notice}</span><button onClick={() => setNotice("")}>Dismiss</button></div>}
              {!loading && featured && !query && activeCategory === "All stories" && <div className="section-head"><div><span className="eyebrow">A GOOD PLACE TO BEGIN</span><h2>Today’s pick <span className="section-sparkle">✳</span></h2></div><button className="text-link" onClick={() => openPost(featured)}>Read story <ArrowRight size={15} /></button></div>}
              {loading ? <div className="loading-state"><span className="spinner" />Finding a good read…</div> : feedError ? <div className="empty-state" role="alert"><div className="empty-icon"><Search size={22} /></div><h2>Stories couldn't load</h2><p>{feedError}</p><button className="quiet-button" onClick={() => void fetchPosts()}>Try again</button></div> : posts.length === 0 ? <div className="empty-state"><div className="empty-icon"><Search size={22} /></div><h2>No stories found</h2><p>Try another search or choose a different topic.</p><button className="quiet-button" onClick={() => { setQuery(""); setActiveCategory("All stories"); }}>Show all stories</button></div> : (
                <>
                  {!query && activeCategory === "All stories" && featured && <StoryCard post={featured} onOpen={(post) => void openPost(post)} featured />}
                  {remainingPosts.length > 0 && <div className="section-head latest-head"><div><span className="eyebrow">{query ? "SEARCH RESULTS" : activeCategory === "All stories" ? "FRESH FROM THE COMMUNITY" : "A LITTLE MORE TO EXPLORE"}</span><h2>{query ? `Stories matching “${query}”` : activeCategory === "All stories" ? "Latest stories" : activeCategory}<span className="section-sparkle">✳</span></h2></div><button className="text-link" onClick={() => { setActiveCategory("All stories"); setQuery(""); }}>See all <ArrowRight size={15} /></button></div>}
                  <div className="story-grid">{(query || activeCategory !== "All stories" ? posts : remainingPosts).map((post) => <StoryCard key={post.id} post={post} onOpen={(item) => void openPost(item)} />)}</div>
                  {!query && activeCategory === "All stories" && <div className="newsletter"><div><span className="eyebrow">A NOTE FROM US</span><h2>Good things start here.</h2><p>Read a little. Write a little. Leave the page better.</p></div><button className="newsletter-cta" onClick={startWriting}>Share a story <ArrowRight size={16} /></button><span className="newsletter-star">✳</span></div>}
                </>
              )}
              <footer className="feed-footer"><span>Made for the curious, by the curious.</span><span>Take what you need. Leave something kind.</span></footer>
            </>
          )}
        </section>

        <aside className="right-rail">
          <div className="rail-welcome"><div className="rail-head"><div><span className="eyebrow">A SMALL REMINDER</span><h3>Make room<br />for wonder.</h3></div><div className="rail-flower">✳</div></div><p>The best ideas don’t always arrive on schedule. Stay curious until they do.</p><span className="rail-signature">— The Inkwell team</span><div className="rail-decoration" /></div>
          <section className="people-section"><div className="rail-section-head"><div><span className="eyebrow">GOOD COMPANY</span><h3>Writers to know</h3></div><button aria-label="More writers"><ArrowRight size={16} /></button></div>{suggestions.map((person) => <button className="person-row" key={person.name} onClick={() => { setQuery(person.name); setSelected(null); }}><span className={`person-avatar ${person.color}`}>{person.initials}</span><span className="person-detail"><strong>{person.name}</strong><small>{person.field}</small></span><span className="follow-mark">+</span></button>)}</section>
          <div className="writer-card"><div className="writer-card-top"><div className="writer-icon"><PenLine size={17} /></div><span>ONE FOR THE NOTEBOOK</span></div><h3>What did you learn the hard way that you wish you’d known earlier?</h3><p>Sometimes the best stories begin with a question.</p><button onClick={startWriting}>Write about it <ArrowRight size={14} /></button><span className="card-doodle">〰</span></div>
          <div className="reading-note"><Clock3 size={15} /><span>Your reading list is yours to keep.</span></div>
        </aside>
      </main>
      {dialog === "auth" && <AuthDialog onClose={() => setDialog(null)} />}
      {dialog === "editor" && <EditorDialog post={editing} onClose={() => setDialog(null)} onSaved={(post) => { setPosts((current) => editing ? current.map((item) => item.id === post.id ? post : item) : [post, ...current]); if (selected?.id === post.id) setSelected(post); setNotice("Your story is live. Thanks for sharing it."); }} />}
      <button className="floating-write" onClick={startWriting} aria-label="Write a story"><Plus size={21} /><span>Write</span></button>
    </div>
  );
}
