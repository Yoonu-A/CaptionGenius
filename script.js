/**
 * CaptionGenius AI - Main Application Logic
 * Supports: English, Sinhala (සිංහල), Tamil (தமிழ்)
 * Platforms: TikTok, Instagram, Facebook, YouTube
 * Architecture: Modular state, Smart Creative Fallback Engine, Gemini API Connector, PWA
 */

(function () {
  'use strict';

  // ==========================================================================
  // 1. Initial State & Persistent Storage
  // ==========================================================================

  const STORAGE_KEYS = {
    THEME: 'captiongenius_theme',
    CREDITS: 'captiongenius_credits',
    CREDITS_DATE: 'captiongenius_credits_date',
    IS_PRO: 'captiongenius_is_pro',
    SAVED: 'captiongenius_saved',
    HISTORY: 'captiongenius_history',
    PLATFORM_STATS: 'captiongenius_platform_stats',
    AI_CONFIG: 'captiongenius_ai_config'
  };

  const MAX_FREE_CREDITS = 15;

  const state = {
    theme: localStorage.getItem(STORAGE_KEYS.THEME) || 'dark',
    activeView: 'generator',
    credits: MAX_FREE_CREDITS,
    isProDemo: localStorage.getItem(STORAGE_KEYS.IS_PRO) === 'true',
    savedCaptions: [],
    history: [],
    platformStats: { tiktok: 0, instagram: 0, facebook: 0, youtube: 0 },
    aiSettings: {
      mode: 'template', // 'template' | 'gemini' | 'backend'
      geminiKey: '',
      backendUrl: ''
    },
    currentVariations: [],
    activeVariationIndex: 0,
    currentPlatform: 'tiktok',
    currentLanguage: 'english',
    currentTone: 'funny',
    currentLength: 'medium',
    includeHooks: true,
    includeCTA: true,
    emojiDensity: 'standard',
    hashtagsCount: 12,
    deferredPrompt: null
  };

  // Load Saved Data from LocalStorage
  function initStorage() {
    try {
      // Saved Captions
      const rawSaved = localStorage.getItem(STORAGE_KEYS.SAVED);
      state.savedCaptions = rawSaved ? JSON.parse(rawSaved) : [];

      // History
      const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
      state.history = rawHistory ? JSON.parse(rawHistory) : [];

      // Platform Stats
      const rawStats = localStorage.getItem(STORAGE_KEYS.PLATFORM_STATS);
      if (rawStats) {
        state.platformStats = Object.assign(state.platformStats, JSON.parse(rawStats));
      }

      // AI Settings
      const rawAi = localStorage.getItem(STORAGE_KEYS.AI_CONFIG);
      if (rawAi) {
        state.aiSettings = Object.assign(state.aiSettings, JSON.parse(rawAi));
      }

      // Daily Credits Reset Check
      const today = new Date().toISOString().slice(0, 10);
      const lastResetDate = localStorage.getItem(STORAGE_KEYS.CREDITS_DATE);
      const storedCredits = localStorage.getItem(STORAGE_KEYS.CREDITS);

      if (lastResetDate !== today) {
        state.credits = MAX_FREE_CREDITS;
        localStorage.setItem(STORAGE_KEYS.CREDITS, state.credits.toString());
        localStorage.setItem(STORAGE_KEYS.CREDITS_DATE, today);
      } else if (storedCredits !== null) {
        state.credits = parseInt(storedCredits, 10) || 0;
      }
    } catch (err) {
      console.warn('Storage initialization warning:', err);
    }
  }

  // ==========================================================================
  // 2. DOM Elements Selection
  // ==========================================================================

  const DOM = {
    html: document.documentElement,
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    creditsBtn: document.getElementById('creditsBtn'),
    creditsDisplay: document.getElementById('creditsDisplay'),
    engineDot: document.getElementById('engineDot'),
    engineLabel: document.getElementById('engineLabel'),
    aiSettingsBtn: document.getElementById('aiSettingsBtn'),
    helpGuideBtn: document.getElementById('helpGuideBtn'),
    pwaInstallBtn: document.getElementById('pwaInstallBtn'),
    navSavedCount: document.getElementById('navSavedCount'),

    // Nav Tabs
    tabBtnGenerator: document.getElementById('tabBtnGenerator'),
    tabBtnDashboard: document.getElementById('tabBtnDashboard'),
    tabBtnSaved: document.getElementById('tabBtnSaved'),
    tabBtnPricing: document.getElementById('tabBtnPricing'),

    // Views
    viewGenerator: document.getElementById('viewGenerator'),
    viewDashboard: document.getElementById('viewDashboard'),
    viewSaved: document.getElementById('viewSaved'),
    viewPricing: document.getElementById('viewPricing'),

    // Generator Form
    promptInput: document.getElementById('promptInput'),
    promptCharCount: document.getElementById('promptCharCount'),
    clearPromptBtn: document.getElementById('clearPromptBtn'),
    chipsContainer: document.querySelector('.chips-container'),
    platformCards: document.querySelectorAll('.platform-card'),
    platformHint: document.getElementById('platformHint'),
    langPills: document.querySelectorAll('.lang-pill'),
    toneChips: document.querySelectorAll('.tone-chip'),
    lengthSegments: document.querySelectorAll('.segment-btn'),
    optIncludeHooks: document.getElementById('optIncludeHooks'),
    optIncludeCTA: document.getElementById('optIncludeCTA'),
    optEmojiDensity: document.getElementById('optEmojiDensity'),
    optHashtagsCount: document.getElementById('optHashtagsCount'),
    generateBtn: document.getElementById('generateBtn'),

    // Results UI
    engineBanner: document.getElementById('engineBanner'),
    bannerIcon: document.getElementById('bannerIcon'),
    bannerTitle: document.getElementById('bannerTitle'),
    bannerSub: document.getElementById('bannerSub'),
    bannerConfigBtn: document.getElementById('bannerConfigBtn'),
    emptyState: document.getElementById('emptyState'),
    loadingState: document.getElementById('loadingState'),
    loadingText: document.getElementById('loadingText'),
    resultsContent: document.getElementById('resultsContent'),
    varTabs: [
      document.getElementById('varTab0'),
      document.getElementById('varTab1'),
      document.getElementById('varTab2')
    ],
    favoriteActiveBtn: document.getElementById('favoriteActiveBtn'),
    hookContainer: document.getElementById('hookContainer'),
    hookDisplay: document.getElementById('hookDisplay'),
    copyHookBtn: document.getElementById('copyHookBtn'),
    charCounter: document.getElementById('charCounter'),
    captionTextDisplay: document.getElementById('captionTextDisplay'),
    ctaContainer: document.getElementById('ctaContainer'),
    ctaDisplay: document.getElementById('ctaDisplay'),
    hashtagsDisplay: document.getElementById('hashtagsDisplay'),
    hashtagCountBadge: document.getElementById('hashtagCountBadge'),
    copyTagsOnlyBtn: document.getElementById('copyTagsOnlyBtn'),

    // Result Actions
    copyFullCaptionBtn: document.getElementById('copyFullCaptionBtn'),
    copyHashtagsBtn: document.getElementById('copyHashtagsBtn'),
    saveCaptionBtn: document.getElementById('saveCaptionBtn'),
    saveBtnText: document.getElementById('saveBtnText'),
    saveIcon: document.getElementById('saveIcon'),
    shareCaptionBtn: document.getElementById('shareCaptionBtn'),
    regenerateBtn: document.getElementById('regenerateBtn'),

    // Dashboard Elements
    dashCreditsVal: document.getElementById('dashCreditsVal'),
    dashTotalGenVal: document.getElementById('dashTotalGenVal'),
    dashSavedVal: document.getElementById('dashSavedVal'),
    dashTopPlatformVal: document.getElementById('dashTopPlatformVal'),
    tiktokDistCount: document.getElementById('tiktokDistCount'),
    igDistCount: document.getElementById('igDistCount'),
    fbDistCount: document.getElementById('fbDistCount'),
    ytDistCount: document.getElementById('ytDistCount'),
    tiktokBar: document.getElementById('tiktokBar'),
    igBar: document.getElementById('igBar'),
    fbBar: document.getElementById('fbBar'),
    ytBar: document.getElementById('ytBar'),
    dashRecentList: document.getElementById('dashRecentList'),
    dashCreateNewBtn: document.getElementById('dashCreateNewBtn'),
    dashViewAllSavedBtn: document.getElementById('dashViewAllSavedBtn'),

    // Saved Captions View
    savedSearchInput: document.getElementById('savedSearchInput'),
    filterTypeSelect: document.getElementById('filterTypeSelect'),
    filterPlatformSelect: document.getElementById('filterPlatformSelect'),
    filterLangSelect: document.getElementById('filterLangSelect'),
    savedCardsList: document.getElementById('savedCardsList'),
    emptySavedState: document.getElementById('emptySavedState'),
    savedGoGenerateBtn: document.getElementById('savedGoGenerateBtn'),
    exportTxtBtn: document.getElementById('exportTxtBtn'),
    exportJsonBtn: document.getElementById('exportJsonBtn'),
    clearAllHistoryBtn: document.getElementById('clearAllHistoryBtn'),

    // Pro Demo Elements
    proDemoToggle: document.getElementById('proDemoToggle'),
    proDemoStatusLabel: document.getElementById('proDemoStatusLabel'),
    activateProDemoBtn: document.getElementById('activateProDemoBtn'),

    // AI Settings Modal
    aiSettingsModal: document.getElementById('aiSettingsModal'),
    closeAiModalBtn: document.getElementById('closeAiModalBtn'),
    cancelAiSettingsBtn: document.getElementById('cancelAiSettingsBtn'),
    saveAiSettingsBtn: document.getElementById('saveAiSettingsBtn'),
    engineRadios: document.querySelectorAll('input[name="aiEngineMode"]'),
    optEngineTemplate: document.getElementById('optEngineTemplate'),
    optEngineGemini: document.getElementById('optEngineGemini'),
    optEngineBackend: document.getElementById('optEngineBackend'),
    geminiKeyWrap: document.getElementById('geminiKeyWrap'),
    geminiApiKeyInput: document.getElementById('geminiApiKeyInput'),
    toggleApiKeyVisibilityBtn: document.getElementById('toggleApiKeyVisibilityBtn'),
    testApiKeyBtn: document.getElementById('testApiKeyBtn'),
    apiKeyTestResult: document.getElementById('apiKeyTestResult'),
    backendUrlWrap: document.getElementById('backendUrlWrap'),
    backendUrlInput: document.getElementById('backendUrlInput'),

    // Help Modal
    helpGuideModal: document.getElementById('helpGuideModal'),
    closeHelpModalBtn: document.getElementById('closeHelpModalBtn'),
    closeHelpModalActionBtn: document.getElementById('closeHelpModalActionBtn'),
    helpTabs: document.querySelectorAll('.help-tab'),
    helpPanels: document.querySelectorAll('.help-content-panel'),

    // Toast
    toastContainer: document.getElementById('toastContainer')
  };

  // ==========================================================================
  // 3. UI Helpers & Toast Notification System
  // ==========================================================================

  function showToast(message, type = 'success', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = type === 'success' ? '✓' : type === 'error' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${escapeHtml(message)}</span>`;
    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  // Update Theme
  function applyTheme(theme) {
    state.theme = theme;
    DOM.html.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }

  // Switch Active View
  function switchView(viewName) {
    state.activeView = viewName;
    const views = [
      { name: 'generator', el: DOM.viewGenerator, btn: DOM.tabBtnGenerator },
      { name: 'dashboard', el: DOM.viewDashboard, btn: DOM.tabBtnDashboard },
      { name: 'saved', el: DOM.viewSaved, btn: DOM.tabBtnSaved },
      { name: 'pricing', el: DOM.viewPricing, btn: DOM.tabBtnPricing }
    ];

    views.forEach(v => {
      if (v.name === viewName) {
        v.el.classList.add('active');
        v.btn.classList.add('active');
        v.btn.setAttribute('aria-selected', 'true');
      } else {
        v.el.classList.remove('active');
        v.btn.classList.remove('active');
        v.btn.setAttribute('aria-selected', 'false');
      }
    });

    if (viewName === 'dashboard') {
      renderDashboard();
    } else if (viewName === 'saved') {
      renderSavedCaptions();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Update Credits & Pro Status in Header
  function updateCreditsUI() {
    if (state.isProDemo) {
      DOM.creditsDisplay.textContent = 'Pro Unlimited 💎';
      DOM.creditsBtn.style.color = '#A855F7';
      DOM.creditsBtn.style.borderColor = 'rgba(168, 85, 247, 0.4)';
      DOM.creditsBtn.style.background = 'rgba(168, 85, 247, 0.12)';
      DOM.proDemoToggle.checked = true;
      DOM.proDemoStatusLabel.textContent = 'Pro Mode Preview Active ✨';
    } else {
      DOM.creditsDisplay.textContent = `${state.credits} / ${MAX_FREE_CREDITS} Credits`;
      DOM.creditsBtn.style.color = state.credits > 3 ? '#FBBF24' : '#EF4444';
      DOM.creditsBtn.style.borderColor = state.credits > 3 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)';
      DOM.creditsBtn.style.background = state.credits > 3 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)';
      DOM.proDemoToggle.checked = false;
      DOM.proDemoStatusLabel.textContent = 'Free Mode Active';
    }
    DOM.navSavedCount.textContent = state.savedCaptions.length;
  }

  // Update AI Engine Indicator UI
  function updateEngineUI() {
    if (state.aiSettings.mode === 'gemini' && state.aiSettings.geminiKey) {
      DOM.engineDot.className = 'status-dot dot-ai';
      DOM.engineLabel.textContent = 'Gemini AI';
      DOM.bannerIcon.textContent = '✨';
      DOM.bannerTitle.textContent = 'Google Gemini AI Engine Active';
      DOM.bannerSub.textContent = 'Generating real-time contextual AI captions with your connected key.';
      DOM.bannerConfigBtn.textContent = 'Settings';
    } else if (state.aiSettings.mode === 'backend' && state.aiSettings.backendUrl) {
      DOM.engineDot.className = 'status-dot dot-ai';
      DOM.engineLabel.textContent = 'Custom Backend';
      DOM.bannerIcon.textContent = '🛡️';
      DOM.bannerTitle.textContent = 'Secure Backend AI Proxy Active';
      DOM.bannerSub.textContent = `Routing generation through ${state.aiSettings.backendUrl}`;
      DOM.bannerConfigBtn.textContent = 'Settings';
    } else {
      DOM.engineDot.className = 'status-dot dot-fallback';
      DOM.engineLabel.textContent = 'Smart Engine';
      DOM.bannerIcon.textContent = '⚡';
      DOM.bannerTitle.textContent = 'Smart Creative Engine Active (Local Fallback)';
      DOM.bannerSub.textContent = 'Free & Offline. Curated viral hooks & templates for Sri Lanka & Worldwide.';
      DOM.bannerConfigBtn.textContent = 'Configure AI';
    }
  }

  // ==========================================================================
  // 4. Smart Creative Fallback Engine (English, Sinhala & Tamil)
  // ==========================================================================

  const HASHTAG_VAULT = {
    english: {
      global: ['#Viral', '#TrendingNow', '#ContentCreator', '#ExplorePage', '#FYP', '#CreatorsOfTikTok', '#ReelsInstagram', '#VibeCheck', '#MustWatch', '#SocialMediaGrowth'],
      srilanka: ['#SriLanka', '#VisitSriLanka', '#Colombo', '#SriLankaDaily', '#Ceylon', '#LKA', '#IslandLife', '#TravelSriLanka', '#SriLankanCreators', '#EllaSriLanka'],
      humor: ['#FunnyVideo', '#Relatable', '#ComedyReels', '#LaughDaily', '#MemesDaily', '#TagAFriend', '#Lmao'],
      business: ['#BusinessTips', '#EntrepreneurMindset', '#GrowthHacking', '#Freelancing', '#DigitalMarketing', '#SuccessMindset', '#ProductivityHacks'],
      inspiration: ['#MotivationDaily', '#NeverGiveUp', '#InspirationalQuotes', '#MindsetShift', '#DreamBig', '#Overcome', '#SelfGrowth'],
      romantic: ['#LoveStory', '#CoupleGoals', '#RomanticVibes', '#HeartfeltMoments', '#Soulmate', '#LoveQuotes'],
      aesthetic: ['#AestheticVibes', '#CozyMoments', '#SoftAesthetic', '#VisualPoetry', '#MoodBoard', '#PeacefulVibes']
    },
    sinhala: {
      global: ['#srilanka', '#sinhala', '#trending_srilanka', '#tiktok_srilanka', '#lka', '#ceylon', '#colombo', '#viral_sinhala', '#srilankatiktok', '#sinhalareels'],
      humor: ['#ආතල්_ලෝකය', '#ලංකාවේ_අපි', '#හිනාවෙමු', '#funny_sinhala', '#lka_memes', '#trending_lka', '#sinhalameme', '#srilankancomedy'],
      business: ['#ව්‍යාපාරික_දැනුම', '#සාර්ථකත්වය', '#මුදල්', '#onlinebusiness_srilanka', '#freelance_srilanka', '#sinhalamotivation', '#startup_lk'],
      inspiration: ['#ජීවිතය', '#ධෛර්යය', '#සිහින', '#sinhalapoem', '#motivation_sinhala', '#nevergiveup_lk', '#hustle_srilanka'],
      romantic: ['#ආදරය', '#නුඹ_මගේ', '#හදවත', '#sinhalasongs', '#romantic_sinhala', '#love_srilanka', '#sad_sinhala'],
      aesthetic: ['#සුන්දර_ලංකාව', '#සන්සුන්_හැන්දෑව', '#නිදහස', '#ceylon_beauty', '#nature_srilanka', '#aesthetic_lk', '#ella_srilanka']
    },
    tamil: {
      global: ['#srilanka', '#tamil', '#srilankatamil', '#jaffna', '#colombo', '#tamiltiktok', '#trending_tamil', '#viral_tamil', '#tamilcreator', '#tamilsrilanka'],
      humor: ['#நகைச்சுவை', '#தமிழ்மீம்ஸ்', '#சிரிப்பு', '#tamilcomedy', '#tamilhumor', '#tamillmaofun', '#trendingnow_tamil'],
      business: ['#வணிகம்', '#முன்னேற்றம்', '#வெற்றி', '#tamilentrepreneur', '#tamilbusiness', '#tamiltech', '#tamilmoney'],
      inspiration: ['#உத்வேகம்', '#விடாமுயற்சி', '#நம்பிக்கை', '#tamilmotivation', '#tamilstatus', '#tamilquotes', '#success_tamil'],
      romantic: ['#காதல்', '#கவிதைகள்', '#என்_அன்பு', '#tamilromance', '#tamillove', '#tamilsonglyrics', '#tamilbgm'],
      aesthetic: ['#அழகு', '#இயற்கை', '#அமைதி', '#tamilaesthetic', '#jaffnavibes', '#srilankatamilculture', '#tamiltravel']
    }
  };

  const PLATFORM_CHARACTER_LIMITS = {
    tiktok: { max: 2200, name: 'TikTok' },
    instagram: { max: 2200, name: 'Instagram' },
    facebook: { max: 63206, name: 'Facebook' },
    youtube: { max: 5000, name: 'YouTube' }
  };

  // Generate 3 variations using the built-in creative engine
  function generateFallbackVariations(topic, platform, language, tone, length, options) {
    const cleanTopic = topic.trim() || (
      language === 'sinhala' ? 'අපේ සුන්දර ලංකාවේ විශේෂ අත්දැකීමක්' :
      language === 'tamil' ? 'இலங்கையின் மறக்க முடியாத அழகான அனுபவம்' :
      'An unforgettable experience in beautiful Sri Lanka'
    );

    const variations = [];

    // Variation 1: Punchy & Viral Hook-Focused
    variations.push(buildVariationA(cleanTopic, platform, language, tone, length, options));

    // Variation 2: Storytelling & Emotional Connection
    variations.push(buildVariationB(cleanTopic, platform, language, tone, length, options));

    // Variation 3: Aesthetic, Value-Heavy & Hashtag Focused
    variations.push(buildVariationC(cleanTopic, platform, language, tone, length, options));

    return variations;
  }

  // --- VARIATION BUILDER A: High-Velocity Hook ---
  function buildVariationA(topic, platform, lang, tone, length, opts) {
    let hook = '';
    let body = '';
    let cta = '';

    if (lang === 'sinhala') {
      if (tone === 'funny') {
        hook = `😂 මේක අනිවාර්යයෙන්ම බලන්න! ${topic} ගැන ලංකාවේ අපි විතරයි මෙහෙම කරන්නෙ! 🤦‍♂️🇱🇰`;
        body = `අඩෝ මෙහෙම දේවල් වෙන්නේ ලංකාවේ විතරයි සිරාවටම!\n\nවීඩියෝ එකේ පේන විදියට ${topic} කරද්දි මූණට ආපු reaction එක බලන්නකෝ! 😂 සීරියස්ලි හිනාවෙලා බඩත් රිදෙනවා.\n\nඔයාලගෙත් මේ වගේ පිස්සු නටන යාළුවො ඉන්නවද?`;
        cta = `👇 ටැග් කරන්න ඔයාලගෙ මේ වගේම වැඩ කරන යාළුවෙක්ව! Share කරන්න අමතක කරන්න එපා! 🚀`;
      } else if (tone === 'professional') {
        hook = `📈 ${topic}: සාර්ථකත්වයේ ඔබ නොදත් ප්‍රධාන රහස් මෙන්න!`;
        body = `වර්තමාන ඩිජිටල් ලෝකයේ ඉදිරියට යන්න නම් නිවැරදි සැලසුම් අත්‍යවශ්‍යයි.\n\n${topic} පිළිබඳව අප සොයාගත් ප්‍රධාන කරුණු 3:\n1. නිරන්තර අභ්‍යාසය හා ඉවසීම\n2. කාලීන තාක්ෂණය උපයෝගී කරගැනීම\n3. පාරිභෝගික විශ්වාසය ගොඩනැගීම\n\nඔබේ ව්‍යාපාරයටත් මෙය අදම එකතු කරගන්න.`;
        cta = `📌 මෙම පෝස්ට් එක පසුව කියවීම සඳහා Save කර තබාගන්න. ඔබේ අදහස පහළින් Comment කරන්න!`;
      } else if (tone === 'romantic') {
        hook = `❤️ නුඹ ළඟ ඉන්න හැම මොහොතක්ම මට හීනයක් වගේ... ${topic} ✨`;
        body = `ලෝකයේ කොතැනක හිටියත් මගේ හිත නතර වෙන්නේ නුඹ ළඟ විතරයි.\n\n${topic} එක්ක ගෙවුණු මේ ලස්සන මොහොත ජීවිතේ කවදාවත් අමතක වෙන්නේ නෑ. ආදරය කියන්නේ මෙන්න මේ වගේ පුංචි සුන්දර තත්පර වලටයි. 💕`;
        cta = `💖 ඔබේ ආදරණීයයාට මේ පණිවිඩය Share කර ආදරය මතක් කරන්න!`;
      } else if (tone === 'aesthetic') {
        hook = `🍃 සන්සුන් හැන්දෑවක සුන්දර මතකයන්... ${topic} ☕✨`;
        body = `ලෝකයේ ඝෝෂාවෙන් ඈත්වෙලා, සිත නිවන නිස්කලංක මොහොතක්.\n\n${topic} සමඟින් සොබාදහමේ සැබෑ චමත්කාරය විඳගන්න. ජීවිතය කියන්නේ මෙන්න මේ සරල නිදහස් සුන්දරත්වයටයි. 🌸🇱🇰`;
        cta = `🌿 ඔබේ මනස සන්සුන් කරන ස්ථානය කොතැනද? පහළින් බෙදාගන්න.`;
      } else {
        hook = `🔥 කවදාවත් අත්හරින්න එපා! ${topic} ඔබේ ජීවිතය වෙනස් කරාවි! 💪`;
        body = `අද ඔබ දරන මහන්සිය, හෙට ඔබේ ජයග්‍රහණයේ පදනමයි.\n\n${topic} තුළින් අප ඉගෙන ගත යුත්තේ කුමන බාධක ආවත් අපේ ඉලක්කය අත්නොහැර ඉදිරියටම යා යුතු බවයි. ඔබ තුළ ඒ හැකියාව තියෙනවා! 🚀`;
        cta = `⚡ ඔබටත් මේ දේ කරන්න පුළුවන් කියලා විශ්වාස නම් 'Yes' කියලා Comment කරන්න!`;
      }
    } else if (lang === 'tamil') {
      if (tone === 'funny') {
        hook = `😂 கடைசி வரைக்கும் பாருங்க! ${topic} பத்தி நம்ப பசங்க பண்ற லூட்டி இருக்கே! 🤣🇱🇰`;
        body = `நண்பர்களே இது இலங்கையில மட்டும் தான் நடக்கும்!\n\n${topic} பண்ணும்போது நடந்த கூத்தை நீங்களே பாருங்க! சிரிச்சு சிரிச்சு வயிறு வலிக்குது. 😂 இந்த மாதிரி அனுபவம் உங்களுக்கும் நடந்துருக்கா?`;
        cta = `👇 உங்க நண்பனை இங்க Tag பண்ணுங்க! இந்த வீடியோவை உடனே Share பண்ணுங்க! 🔥`;
      } else if (tone === 'professional') {
        hook = `📊 ${topic}: உங்கள் வெற்றிக்கான முக்கியமான 3 ரகசியங்கள் இதோ!`;
        body = `இன்றைய காலகட்டத்தில் முன்னேற சரியான திட்டமிடல் மிக அவசியம்.\n\n${topic} மூலம் நாம் கற்றுக் கொள்ள வேண்டியவை:\n1. தொடர் முயற்சி மற்றும் ஒழுக்கம்\n2. தொழில்நுட்பத்தை சரியாக பயன்படுத்துதல்\n3. வாடிக்கையாளர் நம்பிக்கை\n\nஉங்கள் இலக்கை நோக்கி தொடர்ந்து பயணியுங்கள்.`;
        cta = `📌 எதிர்கால பயன்பாட்டிற்கு இந்த பதிவை Save செய்து கொள்ளுங்கள்! உங்கள் கருத்துக்களை கீழே பகிருங்கள்.`;
      } else if (tone === 'romantic') {
        hook = `❤️ நீ என் அருகில் இருக்கும் ஒவ்வொரு நொடியும் ஒரு வரம்... ${topic} ✨`;
        body = `உலகம் முழுவதும் சுற்றினாலும் என் மனதிற்கு அமைதி தருவது உன் புன்னகை தான்.\n\n${topic} உடன் கழிந்த இந்த இனிய தருணம் என்றும் என் நினைவில் அழியாது. காதல் என்பது இது போன்ற சின்ன சின்ன தருணங்களில் தான் வாழ்கிறது. 💕`;
        cta = `💖 உங்கள் மனதிற்கு பிடித்தவருக்கு இதை Share செய்து உங்கள் அன்பை வெளிப்படுத்துங்கள்!`;
      } else if (tone === 'aesthetic') {
        hook = `🌿 அமைதியான மாலை பொழுது... ${topic} ☕✨`;
        body = `நகரத்தின் இரைச்சலில் இருந்து விடுபட்டு, இயற்கையோடு இணையும் ஒரு இனிய தருணம்.\n\n${topic} இன் அழகை ரசித்து மனதை அமைதிப்படுத்துங்கள். எளிய விஷயங்களில் தான் பேரழகு ஒளிந்திருக்கிறது. 🌸🇱🇰`;
        cta = `🍃 உங்களுக்கு பிடித்த அமைதியான இடம் எது? Comment இல் சொல்லுங்கள்!`;
      } else {
        hook = `🔥 ஒருபோதும் விட்டுக்கொடுக்காதே! ${topic} உங்களை அடுத்த நிலைக்கு கொண்டு செல்லும்! 💪`;
        body = `இன்று நீங்கள் சிந்துகிற வியர்வை தான், நாளை உங்களின் வெற்றியாக மாறும்.\n\n${topic} நமக்கு கற்றுத்தருவது ஒன்று தான்: தடைகள் வரலாம், ஆனால் உங்கள் கனவை மட்டும் எக்காரணம் கொண்டும் கைவிடாதீர்கள். உங்களால் நிச்சயம் முடியும்! 🚀`;
        cta = `⚡ உங்களை நீங்கள் நம்பினால் உடனே 'Strong' என்று Comment பண்ணுங்க!`;
      }
    } else {
      // English
      if (tone === 'funny') {
        hook = `Wait until the very end! 💀 Anyone else completely obsessed with ${topic}?! 😂👇`;
        body = `I told myself I was only going to do this for 5 minutes... and look where we are now! 🤦‍♂️\n\nIf you've ever tried ${topic}, you already know the chaotic energy is unreal. 10/10 would definitely make this questionable decision again.\n\nWho else is guilty of doing this? Don't leave me hanging here!`;
        cta = `Tag THAT one friend who does this every single time & save this before it disappears! 🚀`;
      } else if (tone === 'professional') {
        hook = `The unwritten playbook for ${topic} that no one talks about 📈`;
        body = `Most people overcomplicate ${topic}, but the top 1% focus on fundamentals.\n\nHere are 3 core frameworks you need today:\n• Clarity over volume: Focus on high-leverage actions.\n• Speed of execution: Perfection is the enemy of momentum.\n• Long-term compound effect: Consistency always outperforms sporadic bursts.\n\nApply these to your current workflow and notice the difference.`;
        cta = `Found this valuable? Bookmark 📌 this post for later and drop your perspective below.`;
      } else if (tone === 'romantic') {
        hook = `Proof that magic is real when you're in the right place with the right person... ✨ ${topic}`;
        body = `Some moments don't need a filter, just a quiet heart to feel them.\n\nExperiencing ${topic} with you felt like stepping right inside a movie scene. The little glances, shared laughter, and warmth that words can barely capture. 💖`;
        cta = `Send this to the person who makes every ordinary day feel extraordinary 💌`;
      } else if (tone === 'aesthetic') {
        hook = `Soft light, warm tea & timeless moments... ☕🍃 ${topic}`;
        body = `Slow mornings and deep breaths.\n\nThere's a subtle poetry in ${topic} that reminds you to pause the rush and embrace the calm around you. Here's your gentle sign to romanticize your daily life. ✨`;
        cta = `Save this for your cozy moodboard and comment your favorite calm spot below 🕊️`;
      } else {
        hook = `Stop waiting for the 'perfect timing'. ${topic} is your sign to start TODAY! 🔥`;
        body = `The difference between where you are and where you want to be is the decision to take messy action.\n\n${topic} taught me that you don't have to have everything figured out from day one. You just have to refuse to quit when it gets tough.\n\nYour future self is going to thank you for pushing through right now. 💪`;
        cta = `Drop a '🔥' in the comments if you are claiming your breakthrough this week!`;
      }
    }

    // Platform Adaptations
    if (platform === 'tiktok') {
      body = `[🎵 Trending Sound Cue: Use trending viral sound]\n\n` + body;
    } else if (platform === 'youtube') {
      body = `📌 In this video: Everything you need to know about ${topic}!\n\n` + body + `\n\n⏱️ TIMESTAMPS:\n0:00 - Intro & Shocking Hook\n0:45 - Key Breakdown: ${topic}\n02:30 - Secret Tips & Mistakes to Avoid\n04:15 - Final Thoughts & Takeaway`;
      cta = `🔔 Don't forget to LIKE, SUBSCRIBE, and turn on bell notifications for more uploads!`;
    }

    const tags = getHashtags(lang, tone, platform, opts.hashtagsCount);
    return {
      type: 'viral',
      badge: 'Variation A: Viral & Punchy',
      hook: hook,
      body: body,
      cta: cta,
      hashtags: tags,
      platform: platform,
      language: lang
    };
  }

  // --- VARIATION BUILDER B: Storytelling & Relatable Connection ---
  function buildVariationB(topic, platform, lang, tone, length, opts) {
    let hook = '';
    let body = '';
    let cta = '';

    if (lang === 'sinhala') {
      hook = `✨ මේක අහන්න... ${topic} ගැන මට හිතුණු දේ! 🇱🇰`;
      body = `සමහර දේවල් අපේ ජීවිත වලට එන්නේ නොහිතන වෙලාවට. ${topic} කියන්නේ මට සෑහෙන්න දේවල් කියාදුන්නු අත්දැකීමක්.\n\nමුලින්ම මටත් මේ ගැන ලොකු බයක් තිබුණා. ඒත් උත්සාහ කරලා බැලුවාම තමයි තේරුණේ හැමදේම පටන් ගන්නකම් විතරයි අමාරු කියලා.\n\nඔයාලටත් මේ වගේ අත්දැකීම් තියෙනවද? අපි හැමෝටම තියෙනවා මෙහෙම මතකයන්.`;
      cta = `👇 ඔයාලගේ අදහස් Comment එකකින් දාන්න. මේ වීඩියෝ එක ඔයාලගෙ යාළුවන්ටත් Share කරන්න!`;
    } else if (lang === 'tamil') {
      hook = `✨ இதை கண்டிப்பா கேளுங்க... ${topic} பற்றி எனக்கு ஏற்பட்ட உண்மை உணர்வு! 🇱🇰`;
      body = `சில தருணங்கள் நம் வாழ்க்கையில் மிகப்பெரிய மாற்றத்தை ஏற்படுத்தும். ${topic} எனக்கு அப்படிப்பட்ட ஒரு மறக்க முடியாத பாடம்.\n\nஆரம்பத்தில் இது கடினமாக தெரிந்தாலும், இறங்கி முயற்சி செய்த போது தான் புரிந்தது, முயற்சிக்கு எல்லை இல்லை என்று.\n\nஉங்களுக்கும் இப்படி ஒரு மறக்க முடியாத கதை இருக்கிறதா? நம் ஒவ்வொருவருக்கும் ஒரு அழகான கதை இருக்கிறது.`;
      cta = `👇 உங்கள் அனுபவங்களை கமெண்டில் பகிர்ந்து கொள்ளுங்கள்! விரும்பினால் Save செய்து வையுங்கள்!`;
    } else {
      hook = `Storytime: Why ${topic} completely changed my perspective this year 📖✨`;
      body = `Six months ago, if you told me I'd be sharing this, I would have laughed.\n\nWhen I first got into ${topic}, I had zero clues, made every mistake in the book, and almost walked away. But sticking with it turned out to be the best decision ever.\n\nTake this as your friendly reminder that beginner awkwardness is just the price of admission for something great.`;
      cta = `Has something similar happened to you? Tell me your story in the comments below! 👇`;
    }

    const tags = getHashtags(lang, tone, platform, opts.hashtagsCount);
    return {
      type: 'story',
      badge: 'Variation B: Story & Connect',
      hook: hook,
      body: body,
      cta: cta,
      hashtags: tags,
      platform: platform,
      language: lang
    };
  }

  // --- VARIATION BUILDER C: Aesthetic & Hashtag Heavy ---
  function buildVariationC(topic, platform, lang, tone, length, opts) {
    let hook = '';
    let body = '';
    let cta = '';

    if (lang === 'sinhala') {
      hook = `🌸 ${topic} | සිත නිවන සොඳුරු මොහොතක් ✨`;
      body = `• ලස්සන මතකයන් හැමදාටම හදවතේ රඳනවා.\n• ${topic} එක්ක ගත කරපු මේ නිදහස් වෙලාව.\n• ජීවිතේ සුන්දරත්වය විඳින්න කියාදෙන තවත් එක අපූරු දවසක්.\n\nලංකාවේ සුන්දරත්වය හැමදාමත් අලුත්. 🍃🇱🇰`;
      cta = `✨ Share this reel with someone who loves peaceful Sri Lankan vibes!`;
    } else if (lang === 'tamil') {
      hook = `🌸 ${topic} | மனதை கவரும் அழகிய தருணம் ✨`;
      body = `• அழகிய நினைவுகள் என்றும் அழியாதவை.\n• ${topic} உடன் கழிந்த இந்த இனிய பொழுது.\n• இயற்கையின் அழகை ரசித்து வாழும் ஒரு வாழ்க்கை.\n\nஎங்கள் அழகிய இலங்கையின் பிரம்மாண்டம்! 🍃🇱🇰`;
      cta = `✨ அமைதியை விரும்பும் உங்கள் நண்பருக்கு இந்த வீடியோவை பகிருங்கள்!`;
    } else {
      hook = `A vibe you didn't know you needed: ${topic} 🤍🕊️`;
      body = `Details that matter:\n- 01. The golden hour light hitting just right.\n- 02. The calm in between the noise of daily routines.\n- 03. Pure appreciation for ${topic}.\n\nRomanticizing every single second because life is too short for rushing.`;
      cta = `Double tap if you feel this mood & save for your weekend aesthetic moodboard 📸`;
    }

    const tags = getHashtags(lang, tone, platform, Math.max(15, opts.hashtagsCount));
    return {
      type: 'aesthetic',
      badge: 'Variation C: Aesthetic & Tags',
      hook: hook,
      body: body,
      cta: cta,
      hashtags: tags,
      platform: platform,
      language: lang
    };
  }

  // Helper to bundle curated hashtags
  function getHashtags(lang, tone, platform, count) {
    const langVault = HASHTAG_VAULT[lang] || HASHTAG_VAULT.english;
    const toneTags = langVault[tone] || langVault.humor;
    const globalTags = langVault.global || [];
    const slTags = HASHTAG_VAULT.english.srilanka;

    const combined = Array.from(new Set([
      ...toneTags,
      ...globalTags,
      ...slTags,
      `#${platform}`,
      `#Trending`
    ]));

    // Shuffle and pick desired count
    const shuffled = combined.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  // ==========================================================================
  // 5. Real AI Generation Connector (Google Gemini Flash API)
  // ==========================================================================

  async function generateWithGemini(promptText, platform, language, tone, length, options) {
    const apiKey = state.aiSettings.geminiKey;
    if (!apiKey) {
      throw new Error('No Gemini API key configured.');
    }

    const langName = language === 'sinhala' ? 'Sinhala (සිංහල script)' : language === 'tamil' ? 'Tamil (தமிழ் script)' : 'English';

    const systemInstructions = `You are "CaptionGenius AI", an expert social media creator assistant specialized in Sri Lankan and global content.
Generate 3 distinct, high-converting social media caption variations for ${platform.toUpperCase()}.
Topic: "${promptText}".
Language: ${langName}.
Tone: ${tone}.
Length: ${length}.
Options: Include 3-second hook: ${options.includeHooks}, Include CTA: ${options.includeCTA}, Hashtags target: ${options.hashtagsCount}.

Output ONLY valid JSON without markdown code fences in this EXACT format:
{
  "variations": [
    {
      "badge": "Variation A: Viral & Punchy",
      "hook": "string",
      "body": "string (with natural linebreaks and emojis)",
      "cta": "string",
      "hashtags": ["#tag1", "#tag2", "#tag3"]
    },
    {
      "badge": "Variation B: Storytelling & Relatable",
      "hook": "string",
      "body": "string",
      "cta": "string",
      "hashtags": ["#tag1", "#tag2"]
    },
    {
      "badge": "Variation C: Aesthetic & Tags",
      "hook": "string",
      "body": "string",
      "cta": "string",
      "hashtags": ["#tag1", "#tag2"]
    }
  ]
}`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemInstructions }] }],
        generationConfig: {
          temperature: 0.75,
          topK: 40,
          topP: 0.95
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API HTTP error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('Empty response received from Gemini.');
    }

    // Clean JSON string if wrapped in markdown
    const cleanedJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedJson);

    if (!parsed.variations || !Array.isArray(parsed.variations)) {
      throw new Error('Invalid format returned by AI.');
    }

    return parsed.variations.map((v, i) => ({
      badge: v.badge || `Variation ${String.fromCharCode(65 + i)}`,
      hook: v.hook || '',
      body: v.body || '',
      cta: v.cta || '',
      hashtags: Array.isArray(v.hashtags) ? v.hashtags : ['#Viral', '#CaptionGenius'],
      platform: platform,
      language: language
    }));
  }

  // Secure Backend Proxy Connector
  async function generateWithBackend(promptText, platform, language, tone, length, options) {
    const backendUrl = state.aiSettings.backendUrl;
    if (!backendUrl) throw new Error('No backend URL configured.');

    const res = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: promptText,
        platform,
        language,
        tone,
        length,
        options
      })
    });

    if (!res.ok) throw new Error(`Backend error: ${res.status}`);
    const data = await res.json();
    return data.variations;
  }

  // ==========================================================================
  // 6. Generation Pipeline & State Update
  // ==========================================================================

  async function handleGenerate() {
    const promptText = DOM.promptInput.value.trim();

    // Check Credits (Unless Pro Demo is active)
    if (!state.isProDemo && state.credits <= 0) {
      showToast('You have used all 15 daily free credits! Reset at midnight or activate Pro Demo.', 'error');
      switchView('pricing');
      return;
    }

    // Validation
    if (!promptText) {
      DOM.promptInput.focus();
      showToast('Please enter what your post or video is about!', 'error');
      return;
    }

    // Gather Form Inputs
    const platformInput = document.querySelector('input[name="platform"]:checked');
    const langInput = document.querySelector('input[name="language"]:checked');
    const toneInput = document.querySelector('input[name="tone"]:checked');
    const lengthInput = document.querySelector('input[name="length"]:checked');

    state.currentPlatform = platformInput ? platformInput.value : 'tiktok';
    state.currentLanguage = langInput ? langInput.value : 'english';
    state.currentTone = toneInput ? toneInput.value : 'funny';
    state.currentLength = lengthInput ? lengthInput.value : 'medium';
    state.includeHooks = DOM.optIncludeHooks.checked;
    state.includeCTA = DOM.optIncludeCTA.checked;
    state.emojiDensity = DOM.optEmojiDensity.value;
    state.hashtagsCount = parseInt(DOM.optHashtagsCount.value, 10) || 12;

    // Show Loading Skeleton
    DOM.emptyState.classList.add('hidden');
    DOM.resultsContent.classList.add('hidden');
    DOM.loadingState.classList.remove('hidden');
    DOM.generateBtn.disabled = true;
    DOM.generateBtn.style.opacity = '0.7';

    // Simulated Loading Text Steps
    const loadingSteps = [
      'Scanning viral hooks for Sri Lanka & Global algorithms...',
      'Crafting high-engagement captions & formatting linebreaks...',
      'Bundling niche hashtags & emojis for maximum reach...'
    ];
    let stepIndex = 0;
    const stepInterval = setInterval(() => {
      stepIndex = (stepIndex + 1) % loadingSteps.length;
      DOM.loadingText.textContent = loadingSteps[stepIndex];
    }, 450);

    let variations = [];
    let isAi = false;

    try {
      if (state.aiSettings.mode === 'gemini' && state.aiSettings.geminiKey) {
        variations = await generateWithGemini(
          promptText,
          state.currentPlatform,
          state.currentLanguage,
          state.currentTone,
          state.currentLength,
          {
            includeHooks: state.includeHooks,
            includeCTA: state.includeCTA,
            hashtagsCount: state.hashtagsCount
          }
        );
        isAi = true;
      } else if (state.aiSettings.mode === 'backend' && state.aiSettings.backendUrl) {
        variations = await generateWithBackend(
          promptText,
          state.currentPlatform,
          state.currentLanguage,
          state.currentTone,
          state.currentLength,
          {
            includeHooks: state.includeHooks,
            includeCTA: state.includeCTA,
            hashtagsCount: state.hashtagsCount
          }
        );
        isAi = true;
      } else {
        // Fallback Creative Engine
        await new Promise(r => setTimeout(r, 650)); // smooth realistic micro-delay
        variations = generateFallbackVariations(
          promptText,
          state.currentPlatform,
          state.currentLanguage,
          state.currentTone,
          state.currentLength,
          {
            includeHooks: state.includeHooks,
            includeCTA: state.includeCTA,
            hashtagsCount: state.hashtagsCount
          }
        );
      }
    } catch (err) {
      console.warn('AI Generation failed, smoothly invoking smart creative engine:', err);
      showToast(`AI Notice: ${err.message}. Using Smart Creative Engine.`, 'error');
      variations = generateFallbackVariations(
        promptText,
        state.currentPlatform,
        state.currentLanguage,
        state.currentTone,
        state.currentLength,
        {
          includeHooks: state.includeHooks,
          includeCTA: state.includeCTA,
          hashtagsCount: state.hashtagsCount
        }
      );
    } finally {
      clearInterval(stepInterval);
      DOM.loadingState.classList.add('hidden');
      DOM.generateBtn.disabled = false;
      DOM.generateBtn.style.opacity = '1';
    }

    // Deduct Credit if not Pro
    if (!state.isProDemo) {
      state.credits = Math.max(0, state.credits - 1);
      localStorage.setItem(STORAGE_KEYS.CREDITS, state.credits.toString());
      updateCreditsUI();
    }

    // Track Analytics
    state.platformStats[state.currentPlatform] = (state.platformStats[state.currentPlatform] || 0) + 1;
    localStorage.setItem(STORAGE_KEYS.PLATFORM_STATS, JSON.stringify(state.platformStats));

    // Store in History
    const historyItem = {
      id: 'gen_' + Date.now(),
      topic: promptText,
      platform: state.currentPlatform,
      language: state.currentLanguage,
      tone: state.currentTone,
      timestamp: new Date().toISOString(),
      variations: variations,
      isAi: isAi
    };
    state.history.unshift(historyItem);
    if (state.history.length > 50) state.history.pop();
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(state.history));

    // Update Results UI
    state.currentVariations = variations;
    state.activeVariationIndex = 0;
    renderResults();

    showToast('✨ 3 Viral Variations Created!', 'success');
  }

  // Render Result Panels
  function renderResults() {
    if (!state.currentVariations || state.currentVariations.length === 0) return;

    DOM.emptyState.classList.add('hidden');
    DOM.loadingState.classList.add('hidden');
    DOM.resultsContent.classList.remove('hidden');

    // Update Variations Tab Buttons
    DOM.varTabs.forEach((tab, idx) => {
      if (idx === state.activeVariationIndex) {
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
      } else {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
      }
    });

    const activeVar = state.currentVariations[state.activeVariationIndex];
    if (!activeVar) return;

    // Hook Display
    if (state.includeHooks && activeVar.hook) {
      DOM.hookContainer.classList.remove('hidden');
      DOM.hookDisplay.textContent = activeVar.hook;
    } else {
      DOM.hookContainer.classList.add('hidden');
    }

    // Body Display
    DOM.captionTextDisplay.innerText = activeVar.body;

    // CTA Display
    if (state.includeCTA && activeVar.cta) {
      DOM.ctaContainer.classList.remove('hidden');
      DOM.ctaDisplay.textContent = activeVar.cta;
    } else {
      DOM.ctaContainer.classList.add('hidden');
    }

    // Hashtags Cloud Display
    DOM.hashtagsDisplay.innerHTML = '';
    const tags = activeVar.hashtags || [];
    DOM.hashtagCountBadge.textContent = `${tags.length} tags`;

    tags.forEach(tag => {
      const tagPill = document.createElement('span');
      tagPill.className = 'hashtag-tag';
      tagPill.textContent = tag;
      tagPill.title = 'Click to copy this hashtag';
      tagPill.addEventListener('click', () => {
        navigator.clipboard.writeText(tag).then(() => {
          showToast(`Copied ${tag}`, 'success');
        });
      });
      DOM.hashtagsDisplay.appendChild(tagPill);
    });

    // Character Counter
    updateCharacterCount();

    // Check if this active variation is in favorites
    checkIfActiveIsSaved();
  }

  function updateCharacterCount() {
    const fullText = buildFullCaptionText();
    const limitInfo = PLATFORM_CHARACTER_LIMITS[state.currentPlatform] || { max: 2200, name: 'Social' };
    DOM.charCounter.textContent = `${fullText.length.toLocaleString()} / ${limitInfo.max.toLocaleString()} chars (${limitInfo.name})`;

    if (fullText.length > limitInfo.max) {
      DOM.charCounter.style.color = '#EF4444';
    } else {
      DOM.charCounter.style.color = 'var(--accent-cyan)';
    }
  }

  function buildFullCaptionText() {
    const activeVar = state.currentVariations[state.activeVariationIndex];
    if (!activeVar) return '';

    const parts = [];
    if (state.includeHooks && activeVar.hook) {
      parts.push(activeVar.hook);
    }
    const bodyContent = DOM.captionTextDisplay.innerText.trim();
    if (bodyContent) {
      parts.push(bodyContent);
    }
    if (state.includeCTA && activeVar.cta) {
      parts.push(activeVar.cta);
    }
    if (activeVar.hashtags && activeVar.hashtags.length > 0) {
      parts.push(activeVar.hashtags.join(' '));
    }

    return parts.join('\n\n');
  }

  // ==========================================================================
  // 7. Clipboard & Saving Operations
  // ==========================================================================

  function copyToClipboard(text, successMsg) {
    if (!text) return;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(successMsg, 'success');
      }).catch(() => fallbackCopy(text, successMsg));
    } else {
      fallbackCopy(text, successMsg);
    }
  }

  function fallbackCopy(text, successMsg) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      showToast(successMsg, 'success');
    } catch (err) {
      showToast('Could not copy to clipboard. Please select text manually.', 'error');
    }
    document.body.removeChild(textArea);
  }

  function checkIfActiveIsSaved() {
    const activeVar = state.currentVariations[state.activeVariationIndex];
    if (!activeVar) return;

    const fullText = buildFullCaptionText();
    const isSaved = state.savedCaptions.some(item => item.fullCaption === fullText);

    if (isSaved) {
      DOM.favoriteActiveBtn.classList.add('starred');
      DOM.favoriteActiveBtn.innerHTML = '<span class="star-icon">★</span>';
      DOM.saveBtnText.textContent = 'Saved! ✓';
      DOM.saveIcon.textContent = '⭐';
    } else {
      DOM.favoriteActiveBtn.classList.remove('starred');
      DOM.favoriteActiveBtn.innerHTML = '<span class="star-icon">☆</span>';
      DOM.saveBtnText.textContent = 'Save Caption';
      DOM.saveIcon.textContent = '💾';
    }
  }

  function toggleSaveActiveCaption() {
    const activeVar = state.currentVariations[state.activeVariationIndex];
    if (!activeVar) {
      showToast('Please generate a caption first!', 'error');
      return;
    }

    const fullText = buildFullCaptionText();
    const existingIndex = state.savedCaptions.findIndex(item => item.fullCaption === fullText);

    if (existingIndex >= 0) {
      // Remove from favorites
      state.savedCaptions.splice(existingIndex, 1);
      localStorage.setItem(STORAGE_KEYS.SAVED, JSON.stringify(state.savedCaptions));
      checkIfActiveIsSaved();
      DOM.navSavedCount.textContent = state.savedCaptions.length;
      showToast('Removed from favorites', 'info');
    } else {
      // Add to favorites
      const newSaved = {
        id: 'save_' + Date.now(),
        topic: DOM.promptInput.value.trim() || 'Social Post',
        platform: state.currentPlatform,
        language: state.currentLanguage,
        tone: state.currentTone,
        hook: activeVar.hook,
        body: DOM.captionTextDisplay.innerText.trim(),
        cta: activeVar.cta,
        hashtags: activeVar.hashtags || [],
        fullCaption: fullText,
        savedAt: new Date().toISOString()
      };

      state.savedCaptions.unshift(newSaved);
      localStorage.setItem(STORAGE_KEYS.SAVED, JSON.stringify(state.savedCaptions));
      checkIfActiveIsSaved();
      DOM.navSavedCount.textContent = state.savedCaptions.length;
      showToast('Saved to your favorites collection! ⭐', 'success');
    }
  }

  // ==========================================================================
  // 8. Dashboard Analytics & Charts Rendering
  // ==========================================================================

  function renderDashboard() {
    // Metrics
    DOM.dashCreditsVal.textContent = state.isProDemo ? 'Unlimited 💎' : `${state.credits} / ${MAX_FREE_CREDITS}`;
    DOM.dashTotalGenVal.textContent = state.history.length;
    DOM.dashSavedVal.textContent = state.savedCaptions.length;

    // Find Top Platform
    let maxCount = -1;
    let topPlatform = 'TikTok';
    const totalPlatformGens = (state.platformStats.tiktok + state.platformStats.instagram + state.platformStats.facebook + state.platformStats.youtube) || 1;

    for (const [plat, count] of Object.entries(state.platformStats)) {
      if (count > maxCount) {
        maxCount = count;
        topPlatform = plat;
      }
    }
    DOM.dashTopPlatformVal.textContent = topPlatform.charAt(0).toUpperCase() + topPlatform.slice(1);

    // Distribution Bars
    DOM.tiktokDistCount.textContent = `${state.platformStats.tiktok} gens`;
    DOM.igDistCount.textContent = `${state.platformStats.instagram} gens`;
    DOM.fbDistCount.textContent = `${state.platformStats.facebook} gens`;
    DOM.ytDistCount.textContent = `${state.platformStats.youtube} gens`;

    DOM.tiktokBar.style.width = `${Math.round((state.platformStats.tiktok / totalPlatformGens) * 100)}%`;
    DOM.igBar.style.width = `${Math.round((state.platformStats.instagram / totalPlatformGens) * 100)}%`;
    DOM.fbBar.style.width = `${Math.round((state.platformStats.facebook / totalPlatformGens) * 100)}%`;
    DOM.ytBar.style.width = `${Math.round((state.platformStats.youtube / totalPlatformGens) * 100)}%`;

    // Recent Activity List
    DOM.dashRecentList.innerHTML = '';
    if (state.history.length === 0) {
      DOM.dashRecentList.innerHTML = '<div class="empty-state-sm">No recent generations yet. Generate your first caption to see it here!</div>';
      return;
    }

    state.history.slice(0, 5).forEach(item => {
      const row = document.createElement('div');
      row.className = 'recent-item';

      const timeStr = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      row.innerHTML = `
        <div class="recent-meta">
          <span class="badge-tag ${item.platform}-bg">${item.platform}</span>
          <strong>${escapeHtml(item.topic.slice(0, 40))}${item.topic.length > 40 ? '...' : ''}</strong>
          <span class="card-hint">(${item.language} • ${item.tone})</span>
        </div>
        <div class="recent-actions">
          <span class="card-hint">${timeStr}</span>
        </div>
      `;
      DOM.dashRecentList.appendChild(row);
    });
  }

  // ==========================================================================
  // 9. Saved Captions View & Filter Rendering
  // ==========================================================================

  function renderSavedCaptions() {
    const query = DOM.savedSearchInput.value.toLowerCase().trim();
    const typeFilter = DOM.filterTypeSelect.value;
    const platformFilter = DOM.filterPlatformSelect.value;
    const langFilter = DOM.filterLangSelect.value;

    let itemsToRender = typeFilter === 'favorites' ? state.savedCaptions : state.history.map(h => ({
      id: h.id,
      topic: h.topic,
      platform: h.platform,
      language: h.language,
      tone: h.tone,
      hook: h.variations?.[0]?.hook || '',
      body: h.variations?.[0]?.body || '',
      cta: h.variations?.[0]?.cta || '',
      hashtags: h.variations?.[0]?.hashtags || [],
      fullCaption: (h.variations?.[0]?.hook || '') + '\n\n' + (h.variations?.[0]?.body || '') + '\n\n' + (h.variations?.[0]?.hashtags?.join(' ') || ''),
      savedAt: h.timestamp
    }));

    // Apply Filters
    itemsToRender = itemsToRender.filter(item => {
      const matchesSearch = !query ||
        item.topic.toLowerCase().includes(query) ||
        item.body.toLowerCase().includes(query) ||
        (item.hook && item.hook.toLowerCase().includes(query)) ||
        (item.hashtags && item.hashtags.some(t => t.toLowerCase().includes(query)));

      const matchesPlatform = platformFilter === 'all' || item.platform === platformFilter;
      const matchesLang = langFilter === 'all' || item.language === langFilter;

      return matchesSearch && matchesPlatform && matchesLang;
    });

    DOM.savedCardsList.innerHTML = '';

    if (itemsToRender.length === 0) {
      DOM.emptySavedState.classList.remove('hidden');
      return;
    }
    DOM.emptySavedState.classList.add('hidden');

    itemsToRender.forEach(item => {
      const card = document.createElement('div');
      card.className = 'saved-item-card';

      const dateStr = new Date(item.savedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

      card.innerHTML = `
        <div class="saved-card-top">
          <span class="saved-platform-badge ${item.platform}-bg">
            ${item.platform.toUpperCase()} • ${item.language.toUpperCase()}
          </span>
          <span class="saved-date">${dateStr}</span>
        </div>
        ${item.hook ? `<div class="saved-hook-preview">🪝 "${escapeHtml(item.hook)}"</div>` : ''}
        <div class="saved-body-preview">${escapeHtml(item.body)}</div>
        <div class="saved-card-actions">
          <div class="saved-btn-group">
            <button class="btn btn-sm btn-primary copy-saved-btn">📋 Copy</button>
            <button class="btn btn-sm btn-secondary copy-saved-tags-btn">🏷️ Tags</button>
          </div>
          <button class="btn btn-sm btn-danger-ghost delete-saved-btn" title="Remove">🗑️</button>
        </div>
      `;

      // Copy Full Button
      card.querySelector('.copy-saved-btn').addEventListener('click', () => {
        copyToClipboard(item.fullCaption, 'Caption copied to clipboard! 📋');
      });

      // Copy Tags Button
      card.querySelector('.copy-saved-tags-btn').addEventListener('click', () => {
        const tags = (item.hashtags || []).join(' ');
        copyToClipboard(tags, 'Hashtags copied! 🏷️');
      });

      // Delete Button
      card.querySelector('.delete-saved-btn').addEventListener('click', () => {
        deleteSavedItem(item.id, typeFilter);
      });

      DOM.savedCardsList.appendChild(card);
    });
  }

  function deleteSavedItem(id, type) {
    if (type === 'favorites') {
      state.savedCaptions = state.savedCaptions.filter(i => i.id !== id);
      localStorage.setItem(STORAGE_KEYS.SAVED, JSON.stringify(state.savedCaptions));
      DOM.navSavedCount.textContent = state.savedCaptions.length;
      showToast('Caption removed from saved collection', 'info');
    } else {
      state.history = state.history.filter(i => i.id !== id);
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(state.history));
      showToast('Item removed from history', 'info');
    }
    renderSavedCaptions();
  }

  // Export Saved Captions
  function exportSaved(format) {
    if (state.savedCaptions.length === 0) {
      showToast('No saved captions to export!', 'error');
      return;
    }

    let fileContent = '';
    let fileName = `CaptionGenius_Saved_${new Date().toISOString().slice(0, 10)}`;
    let mimeType = 'text/plain';

    if (format === 'json') {
      fileContent = JSON.stringify(state.savedCaptions, null, 2);
      fileName += '.json';
      mimeType = 'application/json';
    } else {
      fileName += '.txt';
      fileContent = state.savedCaptions.map((item, idx) => {
        return `========================================\nCAPTION #${idx + 1} [${item.platform.toUpperCase()} - ${item.language.toUpperCase()}]\nTopic: ${item.topic}\nSaved: ${item.savedAt}\n----------------------------------------\n${item.fullCaption}\n========================================\n\n`;
      }).join('\n');
    }

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported ${state.savedCaptions.length} captions as ${format.toUpperCase()}! 💾`, 'success');
  }

  // ==========================================================================
  // 10. Modals Management (AI Settings & Help Guide)
  // ==========================================================================

  function openAiModal() {
    DOM.aiSettingsModal.classList.remove('hidden');

    // Populate values
    const currentMode = state.aiSettings.mode || 'template';
    const radio = document.querySelector(`input[name="aiEngineMode"][value="${currentMode}"]`);
    if (radio) {
      radio.checked = true;
      highlightEngineCard(currentMode);
    }

    DOM.geminiApiKeyInput.value = state.aiSettings.geminiKey || '';
    DOM.backendUrlInput.value = state.aiSettings.backendUrl || '';
    DOM.apiKeyTestResult.classList.add('hidden');
  }

  function highlightEngineCard(mode) {
    DOM.optEngineTemplate.classList.toggle('active', mode === 'template');
    DOM.optEngineGemini.classList.toggle('active', mode === 'gemini');
    DOM.optEngineBackend.classList.toggle('active', mode === 'backend');

    DOM.geminiKeyWrap.classList.toggle('hidden', mode !== 'gemini');
    DOM.backendUrlWrap.classList.toggle('hidden', mode !== 'backend');
  }

  function saveAiSettings() {
    const selectedMode = document.querySelector('input[name="aiEngineMode"]:checked')?.value || 'template';
    const geminiKey = DOM.geminiApiKeyInput.value.trim();
    const backendUrl = DOM.backendUrlInput.value.trim();

    state.aiSettings.mode = selectedMode;
    state.aiSettings.geminiKey = geminiKey;
    state.aiSettings.backendUrl = backendUrl;

    localStorage.setItem(STORAGE_KEYS.AI_CONFIG, JSON.stringify(state.aiSettings));

    updateEngineUI();
    DOM.aiSettingsModal.classList.add('hidden');
    showToast('AI Settings updated successfully! ✨', 'success');
  }

  async function testGeminiApiKey() {
    const key = DOM.geminiApiKeyInput.value.trim();
    if (!key) {
      DOM.apiKeyTestResult.textContent = 'Please enter an API key first.';
      DOM.apiKeyTestResult.className = 'test-result-msg error';
      DOM.apiKeyTestResult.classList.remove('hidden');
      return;
    }

    DOM.testApiKeyBtn.disabled = true;
    DOM.testApiKeyBtn.textContent = 'Testing...';
    DOM.apiKeyTestResult.classList.add('hidden');

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(key)}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello! Respond with: SUCCESS' }] }]
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }

      DOM.apiKeyTestResult.textContent = '✓ Connection successful! Key is valid and active.';
      DOM.apiKeyTestResult.className = 'test-result-msg success';
      DOM.apiKeyTestResult.classList.remove('hidden');
    } catch (err) {
      DOM.apiKeyTestResult.textContent = `⚠️ Connection error: ${err.message}`;
      DOM.apiKeyTestResult.className = 'test-result-msg error';
      DOM.apiKeyTestResult.classList.remove('hidden');
    } finally {
      DOM.testApiKeyBtn.disabled = false;
      DOM.testApiKeyBtn.textContent = 'Test Key';
    }
  }

  // ==========================================================================
  // 11. PWA Installation & Service Worker Setup
  // ==========================================================================

  function initPWA() {
    // Register Service Worker if on http/https
    if ('serviceWorker' in navigator && (window.location.protocol.startsWith('http') || window.location.protocol.startsWith('https'))) {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.warn('Service worker registration note:', err);
      });
    }

    // Handle BeforeInstallPrompt for PWA install button
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      state.deferredPrompt = e;
      DOM.pwaInstallBtn.classList.remove('hidden');
    });

    DOM.pwaInstallBtn.addEventListener('click', async () => {
      if (!state.deferredPrompt) {
        showToast('App is already installed or your browser requires manual Add to Home Screen.', 'info');
        return;
      }
      state.deferredPrompt.prompt();
      const { outcome } = await state.deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        DOM.pwaInstallBtn.classList.add('hidden');
        showToast('CaptionGenius installed on your home screen! 🎉', 'success');
      }
      state.deferredPrompt = null;
    });

    window.addEventListener('appinstalled', () => {
      DOM.pwaInstallBtn.classList.add('hidden');
      state.deferredPrompt = null;
    });
  }

  // ==========================================================================
  // 12. Event Listeners Wiring
  // ==========================================================================

  function setupEventListeners() {
    // Theme Toggle
    DOM.themeToggleBtn.addEventListener('click', () => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
    });

    // Navigation Tabs
    DOM.tabBtnGenerator.addEventListener('click', () => switchView('generator'));
    DOM.tabBtnDashboard.addEventListener('click', () => switchView('dashboard'));
    DOM.tabBtnSaved.addEventListener('click', () => switchView('saved'));
    DOM.tabBtnPricing.addEventListener('click', () => switchView('pricing'));

    // Header Quick Buttons
    DOM.creditsBtn.addEventListener('click', () => switchView('pricing'));
    DOM.aiSettingsBtn.addEventListener('click', openAiModal);
    DOM.bannerConfigBtn.addEventListener('click', openAiModal);
    DOM.helpGuideBtn.addEventListener('click', () => DOM.helpGuideModal.classList.remove('hidden'));

    // Dashboard Buttons
    DOM.dashCreateNewBtn.addEventListener('click', () => switchView('generator'));
    DOM.dashViewAllSavedBtn.addEventListener('click', () => switchView('saved'));

    // Prompt Textarea interactions
    DOM.promptInput.addEventListener('input', () => {
      const len = DOM.promptInput.value.length;
      DOM.promptCharCount.textContent = `${len}/300`;
      DOM.clearPromptBtn.classList.toggle('hidden', len === 0);
    });

    DOM.clearPromptBtn.addEventListener('click', () => {
      DOM.promptInput.value = '';
      DOM.promptCharCount.textContent = '0/300';
      DOM.clearPromptBtn.classList.add('hidden');
      DOM.promptInput.focus();
    });

    // Quick Inspiration Chips
    DOM.chipsContainer.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip-btn');
      if (!chip) return;
      DOM.promptInput.value = chip.getAttribute('data-preset');
      DOM.promptCharCount.textContent = `${DOM.promptInput.value.length}/300`;
      DOM.clearPromptBtn.classList.remove('hidden');
      DOM.promptInput.focus();
    });

    // Platform Selector Change
    DOM.platformCards.forEach(card => {
      card.addEventListener('click', () => {
        DOM.platformCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const plat = card.getAttribute('data-platform');
        const hints = {
          tiktok: 'Viral short-form sound cues & punchy hooks',
          instagram: 'Aesthetic spacing, hashtags & save prompts',
          facebook: 'Storytelling, discussion & comment hooks',
          youtube: 'SEO descriptions, timestamps & subscribe CTAs'
        };
        DOM.platformHint.textContent = hints[plat] || 'Viral content ready';
      });
    });

    // Language Pills
    DOM.langPills.forEach(pill => {
      pill.addEventListener('click', () => {
        DOM.langPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
      });
    });

    // Tone Chips
    DOM.toneChips.forEach(chip => {
      chip.addEventListener('click', () => {
        DOM.toneChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });

    // Length Segment Buttons
    DOM.lengthSegments.forEach(seg => {
      seg.addEventListener('click', () => {
        DOM.lengthSegments.forEach(s => s.classList.remove('active'));
        seg.classList.add('active');
      });
    });

    // Keyboard Shortcut (Ctrl+Enter / Cmd+Enter to Generate)
    DOM.promptInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleGenerate();
      }
    });

    // Main Generate Button
    DOM.generateBtn.addEventListener('click', handleGenerate);
    DOM.regenerateBtn.addEventListener('click', handleGenerate);

    // Variation Tabs Switching
    DOM.varTabs.forEach((tab, index) => {
      tab.addEventListener('click', () => {
        state.activeVariationIndex = index;
        renderResults();
      });
    });

    // Copy Actions
    DOM.copyFullCaptionBtn.addEventListener('click', () => {
      const text = buildFullCaptionText();
      copyToClipboard(text, 'Full caption, hook & hashtags copied! 📋');
    });

    DOM.copyHookBtn.addEventListener('click', () => {
      const activeVar = state.currentVariations[state.activeVariationIndex];
      if (activeVar?.hook) {
        copyToClipboard(activeVar.hook, 'Hook copied! 🪝');
      }
    });

    DOM.copyTagsOnlyBtn.addEventListener('click', () => {
      const activeVar = state.currentVariations[state.activeVariationIndex];
      const tags = (activeVar?.hashtags || []).join(' ');
      copyToClipboard(tags, 'Hashtags copied! 🏷️');
    });

    DOM.copyHashtagsBtn.addEventListener('click', () => {
      const activeVar = state.currentVariations[state.activeVariationIndex];
      const tags = (activeVar?.hashtags || []).join(' ');
      copyToClipboard(tags, 'Hashtags copied! 🏷️');
    });

    // Save & Favorite Actions
    DOM.favoriteActiveBtn.addEventListener('click', toggleSaveActiveCaption);
    DOM.saveCaptionBtn.addEventListener('click', toggleSaveActiveCaption);

    // Share Button (Web Share API)
    DOM.shareCaptionBtn.addEventListener('click', async () => {
      const fullText = buildFullCaptionText();
      if (!fullText) return;

      if (navigator.share) {
        try {
          await navigator.share({
            title: 'CaptionGenius AI Caption',
            text: fullText
          });
          showToast('Shared successfully! 📤', 'success');
        } catch (err) {
          if (err.name !== 'AbortError') {
            copyToClipboard(fullText, 'Copied caption to clipboard for sharing!');
          }
        }
      } else {
        copyToClipboard(fullText, 'Copied caption to clipboard for sharing!');
      }
    });

    // Editable Caption Live Char Counter
    DOM.captionTextDisplay.addEventListener('input', updateCharacterCount);

    // Saved View Search & Filter
    DOM.savedSearchInput.addEventListener('input', renderSavedCaptions);
    DOM.filterTypeSelect.addEventListener('change', renderSavedCaptions);
    DOM.filterPlatformSelect.addEventListener('change', renderSavedCaptions);
    DOM.filterLangSelect.addEventListener('change', renderSavedCaptions);
    DOM.savedGoGenerateBtn.addEventListener('click', () => switchView('generator'));

    // Export & Clear History Buttons
    DOM.exportTxtBtn.addEventListener('click', () => exportSaved('txt'));
    DOM.exportJsonBtn.addEventListener('click', () => exportSaved('json'));
    DOM.clearAllHistoryBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear your saved captions and history? This cannot be undone.')) {
        state.savedCaptions = [];
        state.history = [];
        localStorage.removeItem(STORAGE_KEYS.SAVED);
        localStorage.removeItem(STORAGE_KEYS.HISTORY);
        DOM.navSavedCount.textContent = '0';
        renderSavedCaptions();
        showToast('All saved items and history cleared.', 'info');
      }
    });

    // Pro Demo Toggle
    DOM.proDemoToggle.addEventListener('change', () => {
      state.isProDemo = DOM.proDemoToggle.checked;
      localStorage.setItem(STORAGE_KEYS.IS_PRO, state.isProDemo ? 'true' : 'false');
      updateCreditsUI();
      showToast(state.isProDemo ? 'Pro Demo Mode Activated! Enjoy unlimited generations 💎' : 'Free Mode active', 'success');
    });

    DOM.activateProDemoBtn.addEventListener('click', () => {
      state.isProDemo = true;
      localStorage.setItem(STORAGE_KEYS.IS_PRO, 'true');
      updateCreditsUI();
      showToast('Pro Demo Preview enabled! Unlimited generations unlocked 💎', 'success');
      switchView('generator');
    });

    // AI Settings Modal
    DOM.closeAiModalBtn.addEventListener('click', () => DOM.aiSettingsModal.classList.add('hidden'));
    DOM.cancelAiSettingsBtn.addEventListener('click', () => DOM.aiSettingsModal.classList.add('hidden'));
    DOM.saveAiSettingsBtn.addEventListener('click', saveAiSettings);
    DOM.testApiKeyBtn.addEventListener('click', testGeminiApiKey);

    DOM.engineRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        highlightEngineCard(e.target.value);
      });
    });

    DOM.toggleApiKeyVisibilityBtn.addEventListener('click', () => {
      const type = DOM.geminiApiKeyInput.getAttribute('type');
      if (type === 'password') {
        DOM.geminiApiKeyInput.setAttribute('type', 'text');
        DOM.toggleApiKeyVisibilityBtn.textContent = 'Hide';
      } else {
        DOM.geminiApiKeyInput.setAttribute('type', 'password');
        DOM.toggleApiKeyVisibilityBtn.textContent = 'Show';
      }
    });

    // Help Guide Modal
    DOM.closeHelpModalBtn.addEventListener('click', () => DOM.helpGuideModal.classList.add('hidden'));
    DOM.closeHelpModalActionBtn.addEventListener('click', () => DOM.helpGuideModal.classList.add('hidden'));

    DOM.helpTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        DOM.helpTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const targetId = tab.getAttribute('data-help-target');
        DOM.helpPanels.forEach(panel => {
          panel.classList.toggle('active', panel.id === targetId);
        });
      });
    });

    // Close modals on backdrop click
    [DOM.aiSettingsModal, DOM.helpGuideModal].forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
      });
    });
  }

  // ==========================================================================
  // 13. Initialization Boot
  // ==========================================================================

  function init() {
    initStorage();
    applyTheme(state.theme);
    updateCreditsUI();
    updateEngineUI();
    setupEventListeners();
    initPWA();
    console.log('🚀 CaptionGenius AI initialized. Ready for Sri Lankan & Global creators.');
  }

  // Start when DOM is fully parsed
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
