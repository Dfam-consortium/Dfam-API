const Sequelize = require("sequelize");
//const conn = require("../databases.js").dfam;
const conn = require("../databases.js").getConn_Dfam();

const dbVersionModel = require("../models/db_version.js")(conn, Sequelize);

module.exports = async function(prefix) {
  const version = await dbVersionModel.findOne();
  const year = new Date(version.dfam_release_date).getFullYear();

  const p = prefix;

  return `${p}Dfam - A database of transposable element (TE) sequence alignments and HMMs
${p}Copyright (C) ${year} The Dfam consortium.
${p}
${p}Release: Dfam_${version.dfam_version}
${p}Date   : ${version.dfam_release_date}
${p}
${p}This database is free; you can redistribute it and/or modify it
${p}as you wish, under the terms of the CC0 1.0 license, a
${p}'no copyright' license:
${p}
${p}The Dfam consortium has dedicated the work to the public domain, waiving
${p}all rights to the work worldwide under copyright law, including all related
${p}and neighboring rights, to the extent allowed by law.
${p}
${p}You can copy, modify, distribute and perform the work, even for
${p}commercial purposes, all without asking permission.
${p}See Other Information below.
${p}
${p}
${p}Other Information
${p}
${p}o In no way are the patent or trademark rights of any person affected by
${p}  CC0, nor are the rights that other persons may have in the work or in how
${p}  the work is used, such as publicity or privacy rights.
${p}o Makes no warranties about the work, and disclaims liability for all uses of the
${p}  work, to the fullest extent permitted by applicable law.
${p}o When using or citing the work, you should not imply endorsement by the Dfam consortium.
${p}
${p}You may also obtain a copy of the CC0 license here:
${p}http://creativecommons.org/publicdomain/zero/1.0/legalcode
`;
};
