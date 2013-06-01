<?php /* @var $model vscArrayModel */ ?>
<ul style="list-style:none;">
<?php
if (count ($model->links) > 0 ) {
	foreach ($model->links as $aData) {?>
	<li style="">
		<a class="icon <?php echo $aData['hassecret'] ? 'locked' : 'unlocked'; ?>" style="line-height:32px;width:80%;float:none;padding-left:35px" href="<?php echo urldecode($aData['uri']) ?>" prop-modified="<?php echo $aData['modified'] ?>"><?php echo urldecode ($aData['uri']) ?></a>
	</li>
<?php
	}
} else {
?>
	<li style="">
		<em>Nothing to see here please <a href="?random">move along</a>.</em>
	</li>
<?php
}
?>
</ul>