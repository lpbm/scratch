<?php
import ('domain/models');
class simpleEdit extends vscProcessorA {
	protected $aLocalVars = array ('page' => null);

	public function __construct() {}

	public function init () {}

	public function handleRequest (vscHttpRequestA $oHttpRequest) {
		if (empty($this->aLocalVars['page'])) {
			$this->aLocalVars['page'] = 'index';
		}

		$oRandUrl = new vscUrlRWParser();
		$sStr = substr(sha1(microtime(true)), 0, 7);
		$oRandUrl->addPath($sStr);

		$oUri = new vscUrlRWParser();
		$oUri->setUrl($oUri->getCompleteUri(true));

		$o = new contentTable();
		$o->loadData ($oUri->getPath());
		$o->rand_uri = $oRandUrl->getCompleteUri(true);

		return $o;
	}
}
