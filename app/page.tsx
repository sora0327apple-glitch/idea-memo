'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db, IdeaMemo, Folder, CustomQuestion } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Plus, Clock, Archive, Settings, Trash2, CheckCircle, Share2, 
  FolderInput, X, FolderPlus, Folder as FolderIcon, Image, Video, Mic, Type, Edit3 
} from 'lucide-react';
import { motion, PanInfo } from 'framer-motion';

const DEFAULT_QUESTIONS: CustomQuestion[] = [
  { id: 'why', label: '1. なぜ？（課題・背景）', placeholder: 'なぜこれを思いついたか？' },
  { id: 'trigger', label: '2. きっかけ（トリガー）', placeholder: 'どんな場面で思いついたか？' },
  { id: 'nextAction', label: '3. 次の手（アクション）', placeholder: '具体的にまず何から始めるか？' }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<'feed' | 'history' | 'settings'>('feed');
  const [historySubTab, setHistorySubTab] = useState<'stock' | 'completed'>('stock');
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);

  // 設定状態
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [themeColor, setThemeColor] = useState<'blue' | 'purple' | 'green' | 'dark'>('blue');
  const [questions, setQuestions] = useState<CustomQuestion[]>(DEFAULT_QUESTIONS);

  // 新規フォルダ作成状態
  const [newFolderName, setNewFolderName] = useState('');
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);

  // 設定の読み込み & 保存
  useEffect(() => {
    const savedSize = localStorage.getItem('idea_font_size') as any;
    const savedTheme = localStorage.getItem('idea_theme_color') as any;
    const savedQuestions = localStorage.getItem('idea_custom_questions');
    if (savedSize) setFontSize(savedSize);
    if (savedTheme) setThemeColor(savedTheme);
    if (savedQuestions) {
      try { setQuestions(JSON.parse(savedQuestions)); } catch (e) {}
    }
  }, []);

  const handleFontSizeChange = (size: 'sm' | 'base' | 'lg') => {
    setFontSize(size);
    localStorage.setItem('idea_font_size', size);
  };

  const handleThemeColorChange = (color: 'blue' | 'purple' | 'green' | 'dark') => {
    setThemeColor(color);
    localStorage.setItem('idea_theme_color', color);
  };

  const saveQuestions = (newQ: CustomQuestion[]) => {
    setQuestions(newQ);
    localStorage.setItem('idea_custom_questions', JSON.stringify(newQ));
  };

  const handleAddQuestion = () => {
    const newId = `q_${Date.now()}`;
    const newQ = [...questions, { id: newId, label: `${questions.length + 1}. 新しい質問`, placeholder: '内容を入力...' }];
    saveQuestions(newQ);
  };

  const handleRemoveQuestion = (id: string) => {
    if (questions.length <= 1) {
      alert('質問は最低1つ必要です');
      return;
    }
    const newQ = questions.filter(q => q.id !== id);
    saveQuestions(newQ);
  };

  const handleUpdateQuestion = (id: string, label: string, placeholder: string) => {
    const newQ = questions.map(q => q.id === id ? { ...q, label, placeholder } : q);
    saveQuestions(newQ);
  };

  const getThemeClasses = () => {
    switch (themeColor) {
      case 'purple':
        return { bg: 'bg-purple-600', hover: 'hover:bg-purple-700', text: 'text-purple-600', border: 'border-purple-600', ring: 'focus:ring-purple-500' };
      case 'green':
        return { bg: 'bg-emerald-600', hover: 'hover:bg-emerald-700', text: 'text-emerald-600', border: 'border-emerald-600', ring: 'focus:ring-emerald-500' };
      case 'dark':
        return { bg: 'bg-slate-800', hover: 'hover:bg-slate-900', text: 'text-slate-800', border: 'border-slate-800', ring: 'focus:ring-slate-500' };
      default:
        return { bg: 'bg-blue-600', hover: 'hover:bg-blue-700', text: 'text-blue-600', border: 'border-blue-600', ring: 'focus:ring-blue-500' };
    }
  };

  const theme = getThemeClasses();

  const getTextSizeClass = (type: 'title' | 'body' | 'sub') => {
    if (fontSize === 'sm') {
      if (type === 'title') return 'text-base';
      if (type === 'body') return 'text-xs';
      return 'text-[10px]';
    }
    if (fontSize === 'lg') {
      if (type === 'title') return 'text-xl';
      if (type === 'body') return 'text-base';
      return 'text-xs';
    }
    if (type === 'title') return 'text-lg';
    if (type === 'body') return 'text-sm';
    return 'text-xs';
  };

  // 新規アイデアモーダル状態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [timerHours, setTimerHours] = useState(24);
  const [mediaType, setMediaType] = useState<'text' | 'voice' | 'image' | 'video'>('text');
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setMediaUrl(url);
    }
  };

  const handleStartSpeech = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('お使いのブラウザは音声入力に対応していません');
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.interimResults = true;

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      setContent(transcript);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  // 深掘りモーダル状態
  const [selectedMemo, setSelectedMemo] = useState<IdeaMemo | null>(null);
  const [deepDiveData, setDeepDiveData] = useState<Record<string, string>>({});

  // 詳細閲覧・移動モーダル状態
  const [viewMemo, setViewMemo] = useState<IdeaMemo | null>(null);
  const [moveFolderMemo, setMoveFolderMemo] = useState<IdeaMemo | null>(null);

  // Dexieからのリアルタイムデータ取得
  const feedMemos = useLiveQuery(() => db.memos.where('status').equals('feed').toArray()) || [];
  const stockMemos = useLiveQuery(() => db.memos.where('status').equals('stock').toArray()) || [];
  const completedMemos = useLiveQuery(() => db.memos.where('status').equals('completed').toArray()) || [];
  const folders = useLiveQuery(() => db.folders.toArray()) || [];

  // 自動削除チェック
  useEffect(() => {
    const interval = setInterval(async () => {
      const now = new Date();
      const expired = await db.memos.where('expiresAt').below(now).toArray();
      for (const memo of expired) {
        if (memo.status === 'feed' && memo.id) {
          await db.memos.delete(memo.id);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveQuickMemo = async () => {
    if (!title && !content && !mediaUrl) return;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + timerHours * 60 * 60 * 1000);

    await db.memos.add({
      title: title || (mediaType === 'image' ? '写真のアイデア' : mediaType === 'video' ? '動画のアイデア' : '無題のアイデア'),
      content,
      mediaType,
      mediaUrl,
      folderId: selectedFolderId || undefined,
      createdAt: now,
      expiresAt,
      status: 'feed',
      deepDiveFields: {}
    });

    setTitle('');
    setContent('');
    setMediaUrl('');
    setIsModalOpen(false);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await db.folders.add({
      name: newFolderName.trim(),
      createdAt: new Date()
    });
    setNewFolderName('');
    setIsFolderModalOpen(false);
  };

  const handleSaveDeepDive = async () => {
    if (!selectedMemo || !selectedMemo.id) return;
    const hasInput = Object.values(deepDiveData).some(val => val.trim() !== '');
    if (!hasInput) {
      alert('深掘り項目を1つ以上入力してください');
      return;
    }

    await db.memos.update(selectedMemo.id, {
      status: 'stock',
      deepDiveFields: deepDiveData
    });

    setSelectedMemo(null);
  };

  const handleShare = async (memo: IdeaMemo) => {
    const shareText = `【${memo.title}】\n${memo.content || ''}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: memo.title, text: shareText });
      } catch (err) {}
    } else {
      await navigator.clipboard.writeText(shareText);
      alert('クリップボードにコピーしました！');
    }
  };

  const getRemainingTime = (expiresAt: Date) => {
    const diff = new Date(expiresAt).getTime() - new Date().getTime();
    if (diff <= 0) return '00:00:00';
    const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
    const s = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const currentHistoryMemos = (historySubTab === 'stock' ? stockMemos : completedMemos).filter(memo => {
    if (selectedFolderId === null) return true;
    return memo.folderId === selectedFolderId;
  });

  return (
    <div className="w-full bg-slate-100 min-h-screen flex justify-center">
      <main className="w-full max-w-md min-h-screen bg-slate-50 flex flex-col justify-between pb-20 relative shadow-md">
        
        {/* ヘッダー（タイトルを「いったんビジョン」に変更） */}
        <header className="p-4 bg-white border-b sticky top-0 z-10 flex items-center justify-between shadow-sm h-16 w-full">
          <h1 className="text-xl font-bold text-slate-800">いったんビジョン</h1>
          {selectedFolderId !== null && (
            <button
              onClick={() => setSelectedFolderId(null)}
              className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full flex items-center"
            >
              <FolderIcon className="w-3.5 h-3.5 mr-1 text-yellow-500" />
              フォルダ解除
            </button>
          )}
        </header>

        {/* メインエリア */}
        <div className="p-4 flex-1 w-full overflow-x-hidden">
          {activeTab === 'feed' && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-500 mb-2">深掘り待ち（消滅の危機）</h2>
              {feedMemos.length === 0 ? (
                <p className="text-center text-slate-400 py-10">右下の「＋」からアイデアの種を追加してください</p>
              ) : (
                feedMemos.map((memo) => (
                  <SwipeableCard
                    key={memo.id}
                    onCardClick={() => {
                      setSelectedMemo(memo);
                      const initialData: Record<string, string> = {};
                      questions.forEach(q => {
                        initialData[q.id] = memo.deepDiveFields[q.id] || '';
                      });
                      setDeepDiveData(initialData);
                    }}
                    actions={[
                      {
                        label: '共有',
                        icon: <Share2 className="w-5 h-5 text-white" />,
                        bg: 'bg-blue-500',
                        onClick: () => handleShare(memo)
                      },
                      {
                        label: '削除',
                        icon: <Trash2 className="w-5 h-5 text-white" />,
                        bg: 'bg-red-500',
                        onClick: async () => memo.id && await db.memos.delete(memo.id)
                      }
                    ]}
                  >
                    <div className="border border-red-200 p-1">
                      <h3 className={`font-bold text-slate-800 ${getTextSizeClass('title')}`}>{memo.title}</h3>
                      {memo.mediaUrl && memo.mediaType === 'image' && (
                        <img src={memo.mediaUrl} alt="media" className="w-full h-32 object-cover rounded-lg my-2" />
                      )}
                      {memo.mediaUrl && memo.mediaType === 'video' && (
                        <video src={memo.mediaUrl} controls className="w-full h-32 object-cover rounded-lg my-2" />
                      )}
                      <p className={`text-slate-600 line-clamp-2 mt-1 ${getTextSizeClass('body')}`}>{memo.content}</p>
                      <div className="mt-3 flex justify-between items-center text-slate-400 text-xs">
                        <span>{formatDate(memo.createdAt)}</span>
                        <div className="flex items-center text-red-500 font-mono font-bold text-sm">
                          <Clock className="w-4 h-4 mr-1 animate-pulse" />
                          あと {getRemainingTime(memo.expiresAt)}
                        </div>
                      </div>
                    </div>
                  </SwipeableCard>
                ))
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500">フォルダ整理</span>
                  <button
                    onClick={() => setIsFolderModalOpen(true)}
                    className="text-xs text-blue-600 flex items-center font-medium"
                  >
                    <FolderPlus className="w-3.5 h-3.5 mr-1" /> フォルダ新規作成
                  </button>
                </div>
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  <button
                    onClick={() => setSelectedFolderId(null)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center whitespace-nowrap border ${
                      selectedFolderId === null ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    すべてを表示
                  </button>
                  {folders.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFolderId(f.id!)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center whitespace-nowrap border ${
                        selectedFolderId === f.id ? `${theme.bg} text-white ${theme.border}` : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      <FolderIcon className="w-3.5 h-3.5 mr-1 text-yellow-500" />
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex bg-slate-200 p-1 rounded-lg mb-4">
                <button
                  onClick={() => setHistorySubTab('stock')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
                    historySubTab === 'stock' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  ストック ({stockMemos.length})
                </button>
                <button
                  onClick={() => setHistorySubTab('completed')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
                    historySubTab === 'completed' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  完了 ({completedMemos.length})
                </button>
              </div>

              <div className="space-y-3">
                {currentHistoryMemos.length === 0 ? (
                  <p className="text-center text-slate-400 py-8 text-xs">メモがありません</p>
                ) : (
                  currentHistoryMemos.map((memo) => (
                    <SwipeableCard
                      key={memo.id}
                      onCardClick={() => setViewMemo(memo)}
                      actions={[
                        {
                          label: '共有',
                          icon: <Share2 className="w-5 h-5 text-white" />,
                          bg: 'bg-blue-500',
                          onClick: () => handleShare(memo)
                        },
                        {
                          label: '移動',
                          icon: <FolderInput className="w-5 h-5 text-white" />,
                          bg: 'bg-yellow-500',
                          onClick: () => setMoveFolderMemo(memo)
                        },
                        {
                          label: historySubTab === 'stock' ? '完了' : 'ストック',
                          icon: <CheckCircle className="w-5 h-5 text-white" />,
                          bg: historySubTab === 'stock' ? 'bg-green-500' : 'bg-purple-500',
                          onClick: async () => memo.id && await db.memos.update(memo.id, { status: historySubTab === 'stock' ? 'completed' : 'stock' })
                        },
                        {
                          label: '削除',
                          icon: <Trash2 className="w-5 h-5 text-white" />,
                          bg: 'bg-red-500',
                          onClick: async () => memo.id && await db.memos.delete(memo.id)
                        }
                      ]}
                    >
                      <div className="border border-slate-200 p-1">
                        <h3 className={`font-bold text-slate-800 ${getTextSizeClass('title')}`}>{memo.title}</h3>
                        {memo.mediaUrl && memo.mediaType === 'image' && (
                          <img src={memo.mediaUrl} alt="media" className="w-full h-32 object-cover rounded-lg my-2" />
                        )}
                        <p className={`text-slate-600 line-clamp-2 mt-1 ${getTextSizeClass('body')}`}>{memo.content}</p>
                        <div className="mt-3 flex justify-between items-center text-slate-400 text-xs">
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                            {folders.find(f => f.id === memo.folderId)?.name || '未分類'}
                          </span>
                          <span>{formatDate(memo.createdAt)}</span>
                        </div>
                      </div>
                    </SwipeableCard>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h2 className="font-bold text-slate-800 border-b pb-2">表示設定</h2>

                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-2">文字サイズ</label>
                  <div className="flex space-x-2">
                    {[
                      { key: 'sm', label: '小' },
                      { key: 'base', label: '標準' },
                      { key: 'lg', label: '大' }
                    ].map((item) => (
                      <button
                        key={item.key}
                        onClick={() => handleFontSizeChange(item.key as any)}
                        className={`flex-1 py-2 text-xs rounded-lg border transition ${
                          fontSize === item.key ? `${theme.bg} text-white font-bold` : 'bg-slate-50 text-slate-700'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-2">テーマカラー</label>
                  <div className="flex space-x-2">
                    {[
                      { key: 'blue', label: 'ブルー', bg: 'bg-blue-600' },
                      { key: 'purple', label: 'パープル', bg: 'bg-purple-600' },
                      { key: 'green', label: 'グリーン', bg: 'bg-emerald-600' },
                      { key: 'dark', label: 'ダーク', bg: 'bg-slate-800' }
                    ].map((item) => (
                      <button
                        key={item.key}
                        onClick={() => handleThemeColorChange(item.key as any)}
                        className={`flex-1 py-2 text-xs rounded-lg text-white font-medium transition ${item.bg} ${
                          themeColor === item.key ? 'ring-2 ring-offset-2 ring-slate-400 font-bold' : 'opacity-80'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h2 className="font-bold text-slate-800">深掘り質問のカスタマイズ</h2>
                  <button onClick={handleAddQuestion} className="text-xs text-blue-600 font-bold flex items-center">
                    <Plus className="w-4 h-4 mr-0.5" /> 質問を追加
                  </button>
                </div>

                <div className="space-y-3">
                  {questions.map((q, idx) => (
                    <div key={q.id} className="p-3 border rounded-xl bg-slate-50 relative space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">質問 {idx + 1}</span>
                        {questions.length > 1 && (
                          <button onClick={() => handleRemoveQuestion(q.id)} className="text-red-500 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={q.label}
                        onChange={(e) => handleUpdateQuestion(q.id, e.target.value, q.placeholder)}
                        className="w-full p-2 border rounded-lg text-xs bg-white focus:outline-none"
                        placeholder="質問のタイトル"
                      />
                      <input
                        type="text"
                        value={q.placeholder}
                        onChange={(e) => handleUpdateQuestion(q.id, q.label, e.target.value)}
                        className="w-full p-2 border rounded-lg text-xs bg-white focus:outline-none"
                        placeholder="ヒントテキスト"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FAB */}
        <button
          onClick={() => setIsModalOpen(true)}
          className={`fixed bottom-20 right-1/2 translate-x-[160px] ${theme.bg} ${theme.hover} text-white p-4 rounded-full shadow-lg transition z-20`}
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* 新規作成モーダル */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-bold text-slate-800">新規アイデアを作成</h2>

              <div className="flex bg-slate-100 p-1 rounded-xl">
                {[
                  { type: 'text', label: 'テキスト', icon: <Type className="w-4 h-4" /> },
                  { type: 'image', label: '写真', icon: <Image className="w-4 h-4" /> },
                  { type: 'video', label: '動画', icon: <Video className="w-4 h-4" /> },
                  { type: 'voice', label: '音声', icon: <Mic className="w-4 h-4" /> }
                ].map((item) => (
                  <button
                    key={item.type}
                    onClick={() => {
                      setMediaType(item.type as any);
                      setMediaUrl('');
                    }}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex flex-col items-center transition ${
                      mediaType === item.type ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'
                    }`}
                  >
                    {item.icon}
                    <span className="text-[10px] mt-0.5">{item.label}</span>
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="タイトル"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full p-3 border rounded-xl focus:outline-none focus:ring-2 ${theme.ring} text-base`}
                autoFocus
              />

              {(mediaType === 'image' || mediaType === 'video') && (
                <div className="space-y-2">
                  <input
                    type="file"
                    accept={mediaType === 'image' ? 'image/*' : 'video/*'}
                    onChange={handleFileChange}
                    className="w-full text-xs text-slate-500"
                  />
                  {mediaUrl && mediaType === 'image' && (
                    <img src={mediaUrl} alt="preview" className="w-full h-32 object-cover rounded-xl" />
                  )}
                  {mediaUrl && mediaType === 'video' && (
                    <video src={mediaUrl} controls className="w-full h-32 object-cover rounded-xl" />
                  )}
                </div>
              )}

              {mediaType === 'voice' && (
                <div className="text-center py-2">
                  <button
                    onClick={handleStartSpeech}
                    className={`p-4 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : theme.bg} text-white shadow-md`}
                  >
                    <Mic className="w-6 h-6" />
                  </button>
                  <p className="text-xs text-slate-500 mt-2">
                    {isRecording ? '音声を聞き取り中...' : 'タップして音声文字起こし'}
                  </p>
                </div>
              )}

              <textarea
                placeholder="メモ内容..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={`w-full p-3 border rounded-xl focus:outline-none focus:ring-2 ${theme.ring} h-24 text-base`}
              />
              
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-2">消滅タイマー設定</label>
                <div className="flex space-x-2">
                  {[3, 12, 24, 48].map((h) => (
                    <button
                      key={h}
                      onClick={() => setTimerHours(h)}
                      className={`flex-1 py-2 text-xs rounded-lg border transition ${
                        timerHours === h ? `${theme.bg} text-white font-bold` : 'bg-slate-50 text-slate-700'
                      }`}
                    >
                      {h}時間
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-slate-500 border rounded-xl text-sm font-medium">
                  キャンセル
                </button>
                <button onClick={handleSaveQuickMemo} className={`flex-1 py-3 ${theme.bg} text-white font-bold rounded-xl text-sm`}>
                  タイマー開始
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 深掘りモーダル */}
        {selectedMemo && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-center border-b pb-3">
                <h2 className="text-base font-bold text-slate-800 truncate pr-2">{selectedMemo.title} を深掘り</h2>
                <span className="text-xs text-red-500 font-bold whitespace-nowrap">あと {getRemainingTime(selectedMemo.expiresAt)}</span>
              </div>

              <div className="space-y-3">
                {questions.map((q) => (
                  <div key={q.id}>
                    <label className="text-xs font-bold text-slate-600 block">{q.label}</label>
                    <textarea
                      value={deepDiveData[q.id] || ''}
                      onChange={(e) => setDeepDiveData({ ...deepDiveData, [q.id]: e.target.value })}
                      placeholder={q.placeholder}
                      className={`w-full p-2.5 border rounded-lg text-base mt-1 focus:ring-2 ${theme.ring} outline-none`}
                    />
                  </div>
                ))}
              </div>

              <div className="flex space-x-3 pt-2">
                <button onClick={() => setSelectedMemo(null)} className="flex-1 py-3 text-slate-500 border rounded-xl text-sm font-medium">
                  あとで
                </button>
                <button onClick={handleSaveDeepDive} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl text-sm">
                  深掘りを保存
                </button>
              </div>
            </div>
          </div>
        )}

        {/* フォルダ新規作成モーダル */}
        {isFolderModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 space-y-4 shadow-2xl">
              <h2 className="text-base font-bold text-slate-800">フォルダを新規作成</h2>
              <input
                type="text"
                placeholder="フォルダ名（例: アイデア案）"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className={`w-full p-3 border rounded-xl focus:outline-none focus:ring-2 ${theme.ring} text-base`}
                autoFocus
              />
              <div className="flex space-x-3 pt-2">
                <button onClick={() => setIsFolderModalOpen(false)} className="flex-1 py-3 text-slate-500 border rounded-xl text-sm font-medium">
                  キャンセル
                </button>
                <button onClick={handleCreateFolder} className={`flex-1 py-3 ${theme.bg} text-white font-bold rounded-xl text-sm`}>
                  作成
                </button>
              </div>
            </div>
          </div>
        )}

        {/* フォルダ移動モーダル */}
        {moveFolderMemo && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 space-y-4 shadow-2xl">
              <h2 className="text-base font-bold text-slate-800">移動先フォルダを選択</h2>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                <button
                  onClick={async () => {
                    moveFolderMemo.id && await db.memos.update(moveFolderMemo.id, { folderId: undefined });
                    setMoveFolderMemo(null);
                  }}
                  className="w-full text-left p-2.5 rounded-lg border hover:bg-slate-50 text-xs font-medium"
                >
                  未分類（指定なし）
                </button>
                {folders.map((f) => (
                  <button
                    key={f.id}
                    onClick={async () => {
                      moveFolderMemo.id && await db.memos.update(moveFolderMemo.id, { folderId: f.id });
                      setMoveFolderMemo(null);
                    }}
                    className="w-full text-left p-2.5 rounded-lg border hover:bg-slate-50 text-xs font-medium flex items-center"
                  >
                    <FolderIcon className="w-3.5 h-3.5 mr-2 text-yellow-500" />
                    {f.name}
                  </button>
                ))}
              </div>
              <button onClick={() => setMoveFolderMemo(null)} className="w-full py-2.5 border rounded-xl text-xs font-medium text-slate-500">
                キャンセル
              </button>
            </div>
          </div>
        )}

        {/* 詳細閲覧モーダル */}
        {viewMemo && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl relative">
              <button onClick={() => setViewMemo(null)} className="absolute top-4 right-4 p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-lg font-bold text-slate-800 pr-6">{viewMemo.title}</h2>
              <p className="text-xs text-slate-400">作成日: {formatDate(viewMemo.createdAt)}</p>

              {viewMemo.mediaUrl && viewMemo.mediaType === 'image' && (
                <img src={viewMemo.mediaUrl} alt="media" className="w-full h-40 object-cover rounded-xl" />
              )}
              {viewMemo.mediaUrl && viewMemo.mediaType === 'video' && (
                <video src={viewMemo.mediaUrl} controls className="w-full h-40 object-cover rounded-xl" />
              )}

              <div className="bg-slate-50 p-3 rounded-xl border text-sm text-slate-700 whitespace-pre-wrap">
                {viewMemo.content || '（本文なし）'}
              </div>

              {viewMemo.deepDiveFields && Object.keys(viewMemo.deepDiveFields).length > 0 && (
                <div className="space-y-3 border-t pt-3">
                  <h3 className="text-xs font-bold text-slate-500">深掘りメモ</h3>
                  {questions.map((q) => {
                    const ans = viewMemo.deepDiveFields[q.id];
                    if (!ans) return null;
                    return (
                      <div key={q.id} className="bg-blue-50 p-2.5 rounded-lg border border-blue-100">
                        <span className="text-[10px] font-bold text-blue-600 block mb-0.5">{q.label}</span>
                        <p className="text-xs text-slate-800 whitespace-pre-wrap">{ans}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-2">
                <button onClick={() => setViewMemo(null)} className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm">
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 下部ナビゲーションバー */}
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t flex justify-around p-3 z-10 shadow-lg">
          <button onClick={() => setActiveTab('feed')} className={`flex flex-col items-center relative ${activeTab === 'feed' ? theme.text : 'text-slate-400'}`}>
            <div className="relative">
              <Clock className="w-5 h-5" />
              {feedMemos.length > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[16px] h-[16px] rounded-full flex items-center justify-center leading-none shadow-sm">
                  {feedMemos.length > 99 ? '99+' : feedMemos.length}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 font-medium">深掘り</span>
          </button>
          
          <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center ${activeTab === 'history' ? theme.text : 'text-slate-400'}`}>
            <Archive className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">履歴</span>
          </button>
          
          <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center ${activeTab === 'settings' ? theme.text : 'text-slate-400'}`}>
            <Settings className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">設定</span>
          </button>
        </nav>
      </main>
    </div>
  );
}

// スワイプ可能なカード
interface ActionItem {
  label: string;
  icon: React.ReactNode;
  bg: string;
  onClick: () => void;
}

function SwipeableCard({
  children,
  actions,
  onCardClick,
}: {
  children: React.ReactNode;
  actions: ActionItem[];
  onCardClick?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const actionWidth = actions.length * 56;

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < -40) {
      setIsOpen(true);
    } else if (info.offset.x > 40) {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-white shadow-sm my-2">
      <div className="absolute right-0 top-0 bottom-0 flex items-center justify-end z-0">
        {actions.map((act, idx) => (
          <button
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              act.onClick();
              setIsOpen(false);
            }}
            className={`h-full w-14 flex flex-col items-center justify-center text-white ${act.bg} active:opacity-80 transition`}
          >
            {act.icon}
            <span className="text-[9px] font-medium mt-1">{act.label}</span>
          </button>
        ))}
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -actionWidth, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={{ x: isOpen ? -actionWidth : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
          } else if (onCardClick) {
            onCardClick();
          }
        }}
        className="bg-white p-4 rounded-xl relative z-10 cursor-pointer touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}