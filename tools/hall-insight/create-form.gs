/**
 * Google Apps Script (standalone project).
 * Run createHallInsightForm once in the Google account that will own the form.
 * Creates a private, unpublished form and response spreadsheet. No mail is sent.
 * If setup fails after creation, the log/Script Properties retain IDs for recovery.
 */
function createHallInsightForm() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  const props = PropertiesService.getScriptProperties();
  try {
    if (props.getProperty('FORM_ID')) {
      const existing = FormApp.openById(props.getProperty('FORM_ID'));
      console.log('既存フォーム（重複作成防止）: ' + existing.getEditUrl());
      console.log('回答URL: ' + existing.getPublishedUrl());
      console.log('回答シートID: ' + props.getProperty('SHEET_ID'));
      console.log('SETUP_COMPLETE: ' + props.getProperty('SETUP_COMPLETE'));
      return;
    }
    const f = FormApp.create('愛媛県ホールインサイト｜無料レポート購読登録', false);
    props.setProperty('FORM_ID', f.getId());
    f.setDescription('ホール経営者・営業責任者向けに市場動向・新台導入動向などのレポートを無料でお届けします。登録情報はレポート配信・購読管理・配信に関する連絡に使用し、Googleのサービスで非公開管理します。電話番号は不要です。停止・削除のご希望は https://luckys4900.github.io/contact.html 内の非公開相談フォームへ。個人情報の取扱い: https://luckys4900.github.io/site-privacy.html');
    f.setCollectEmail(false);
    f.setLimitOneResponsePerUser(false);
    f.setPublishingSummary(false);
    f.setAllowResponseEdits(false);
    f.setShowLinkToRespondAgain(false);
    f.setConfirmationMessage('購読登録を受け付けました。レポートの準備が整い次第、登録いただいたメールアドレスへお届けします。配信停止はPS Tool Factoryのお問い合わせ窓口からお申し出いただけます。');
    f.addTextItem().setTitle('法人名').setRequired(true);
    f.addTextItem().setTitle('店舗名・所属部署').setRequired(true);
    f.addTextItem().setTitle('メールアドレス').setValidation(FormApp.createTextValidation().requireTextIsEmail().setHelpText('有効なメールアドレスを入力してください。').build()).setRequired(true);
    f.addTextItem().setTitle('氏名').setRequired(false);
    f.addTextItem().setTitle('役職').setRequired(false);
    f.addCheckboxItem().setTitle('関心のある情報（任意）').setChoiceValues(['県内・商圏の市場動向','新台導入・増台動向','機種別の遊技需要','営業施策の検証事例']).setRequired(false);
    f.addCheckboxItem().setTitle('配信・個人情報の取扱いへの同意').setChoiceValues(['無料レポートの配信および上記の目的での個人情報の利用に同意します']).setRequired(true);
    const s = SpreadsheetApp.create('愛媛県ホールインサイト｜購読者管理（非公開）');
    props.setProperty('SHEET_ID', s.getId());
    f.setDestination(FormApp.DestinationType.SPREADSHEET,s.getId());
    const admin=s.getSheets()[0];admin.setName('運用メモ');admin.getRange('A1:A5').setValues([['管理者専用：共有しない'],['回答シートには個人情報が含まれます'],['配信停止の申出は配信対象から除外し、必要に応じて回答元・管理表双方を削除'],['一斉配信は宛先を他の購読者に公開しない'],['配信内容は公開・再配布の許可を確認する']]);
    props.setProperty('SETUP_COMPLETE','true');
    console.log('フォーム編集URL: '+f.getEditUrl());
    console.log('回答URL（未公開）: '+f.getPublishedUrl());
    console.log('非公開回答シート: '+s.getUrl());
    console.log('次にフォームの公開設定を確認し、リンクを知っている全員に回答権限を付与してください。');
  } finally { lock.releaseLock(); }
}
