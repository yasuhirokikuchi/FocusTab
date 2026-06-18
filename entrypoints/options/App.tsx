import { useEffect } from 'react';
import './style.css';

const SETTINGS_URL = chrome.runtime.getURL('newtab.html?settings=1');

export default function App() {
  useEffect(() => {
    void chrome.tabs.create({ url: SETTINGS_URL }).then(() => {
      window.close();
    });
  }, []);

  return (
    <div className="options-redirect">
      <p>設定ページを開いています…</p>
    </div>
  );
}
