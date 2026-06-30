import { useState } from 'react';

interface Props {
  onComplete: () => Promise<void>;
}

export function OnboardingModal({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const steps = [
    {
      title: 'FocusTab へようこそ',
      body: (
        <>
          <p>
            FocusTab は新規タブを集中ポータルに置き換え、モード（仕事・学習・趣味など）ごとに
            タブ・ブックマーク・閲覧制限を一括切り替えします。
          </p>
          <p className="privacy-note">
            すべてのデータはお使いのブラウザ内にのみ保存されます。アカウント登録やクラウド同期はありません。
            閲覧制限のために <code>&lt;all_urls&gt;</code>{' '}
            権限を使用しますが、ページの内容を読み取ったり外部に送信したりすることはありません。
          </p>
        </>
      ),
    },
    {
      title: '3つのデフォルトモード',
      body: (
        <>
          <ul className="onboarding-list">
            <li>
              <strong>仕事</strong> — SNS・動画サイトをブロック
            </li>
            <li>
              <strong>学習</strong> — 集中向けに制限付き
            </li>
            <li>
              <strong>趣味</strong> — 制限なし
            </li>
          </ul>
          <p className="muted">
            モード切替時、現在のタブは退避され、保存済みタブが復元されます。
          </p>
        </>
      ),
    },
    {
      title: 'ロックと緊急解除',
      body: (
        <>
          <p>
            モードロックを設定すると、ロック中はモード切替ができなくなります。
            制限サイトへアクセスした場合はブロック画面が表示されます。
          </p>
          <p className="muted">
            ロック中に制限サイトへアクセスするとブロック画面が表示されます。右下の「モードロック解除」から固定の解除文を正確に入力すると、モードロックのみ解除できます（サイトの制限は続きます）。
          </p>
        </>
      ),
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  const handleNext = async () => {
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }
    setBusy(true);
    await onComplete();
    setBusy(false);
  };

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="onboarding-card">
        <div className="onboarding-steps" aria-hidden="true">
          {steps.map((_, i) => (
            <span key={i} className={`step-dot${i === step ? ' active' : ''}`} />
          ))}
        </div>
        <h2 id="onboarding-title">{current.title}</h2>
        <div className="onboarding-body">{current.body}</div>
        <div className="onboarding-actions">
          {step > 0 && (
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => setStep((s) => s - 1)}
            >
              戻る
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void handleNext()}
          >
            {isLast ? '始める' : '次へ'}
          </button>
        </div>
      </div>
    </div>
  );
}
