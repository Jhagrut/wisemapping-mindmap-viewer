CREATE TABLE COLLABORATOR (
id INTEGER NOT NULL PRIMARY KEY AUTO_INCREMENT,
email varchar(255) CHARACTER SET utf8  NOT NULL UNIQUE,
creation_date date
) CHARACTER SET utf8;

CREATE TABLE USER (
id INTEGER NOT NULL PRIMARY KEY AUTO_INCREMENT,
colaborator_id INTEGER NOT NULL,
firstname varchar(255) CHARACTER SET utf8 NOT NULL,
lastname varchar(255) CHARACTER SET utf8 NOT NULL,
password varchar(255) CHARACTER SET utf8 NOT NULL,
activation_code BIGINT(20) NOT NULL,
activation_date date,
allow_send_email char(1) CHARACTER SET utf8 NOT NULL default 0,
locale varchar(5),
FOREIGN KEY(colaborator_id) REFERENCES COLLABORATOR(id) ON DELETE CASCADE ON UPDATE NO ACTION
) CHARACTER SET utf8 ;

CREATE TABLE MINDMAP (
id INTEGER NOT NULL PRIMARY KEY AUTO_INCREMENT,
title varchar(255) CHARACTER SET utf8 NOT NULL,
description varchar(255) CHARACTER SET utf8 NOT NULL,
xml blob NOT NULL,
public BOOL not null default 0,
creation_date datetime,
edition_date datetime,
creator_id INTEGER not null,
tags varchar(1014) CHARACTER SET utf8 ,
last_editor_id INTEGER NOT NULL,
FOREIGN KEY(creator_id) REFERENCES USER(colaborator_id) ON DELETE CASCADE ON UPDATE NO ACTION
) CHARACTER SET utf8 ;


CREATE TABLE MINDMAP_HISTORY
(id INTEGER NOT NULL PRIMARY KEY AUTO_INCREMENT,
xml blob NOT NULL,
mindmap_id INTEGER NOT NULL,
creation_date datetime,
editor_id INTEGER NOT NULL,
FOREIGN KEY(mindmap_id) REFERENCES MINDMAP(id) ON DELETE CASCADE ON UPDATE NO ACTION
) CHARACTER SET utf8 ;

CREATE TABLE COLLABORATION_PROPERTIES(
id INTEGER NOT NULL PRIMARY KEY AUTO_INCREMENT,
starred BOOL NOT NULL default 0,
mindmap_properties varchar(512) CHARACTER SET utf8
) CHARACTER SET utf8;

CREATE TABLE COLLABORATION (
id INTEGER NOT NULL PRIMARY KEY AUTO_INCREMENT,
colaborator_id INTEGER NOT NULL,
properties_id INTEGER NOT NULL,
mindmap_id INTEGER NOT NULL,
role_id INTEGER NOT NULL,
FOREIGN KEY(colaborator_id) REFERENCES COLLABORATOR(id),
FOREIGN KEY(mindmap_id) REFERENCES MINDMAP(id) ON DELETE CASCADE ON UPDATE NO ACTION,
FOREIGN KEY(properties_id) REFERENCES COLLABORATION_PROPERTIES(id) ON DELETE CASCADE ON UPDATE NO ACTION
) CHARACTER SET utf8 ;

CREATE TABLE TAG(
id INTEGER NOT NULL PRIMARY KEY AUTO_INCREMENT,
name varchar(255) CHARACTER SET utf8 NOT NULL,
user_id INTEGER NOT NULL,
FOREIGN KEY(user_id) REFERENCES USER(colaborator_id) ON DELETE CASCADE ON UPDATE NO ACTION
) CHARACTER SET utf8 ;

CREATE TABLE ACCESS_AUDITORY (
id INTEGER NOT NULL PRIMARY KEY AUTO_INCREMENT,
login_date date,
user_id INTEGER NOT NULL,
FOREIGN KEY(user_id) REFERENCES USER(id) ON DELETE CASCADE ON UPDATE NO ACTION
) CHARACTER SET utf8 ;

COMMIT;