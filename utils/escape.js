/*
 * Helper function to escape wildcards in SQL 'LIKE'
 * query strings. The escape character must be specified
 * and attached (as in `LIKE :string ESCAPE :escape_char)
 * out of band.
 *
 */
module.exports.escape_sql_like = function(string, escape_char) {
  const rg_esc_char = escape_char.replace('\\', '\\\\');
  return string.replace(new RegExp("[%_" + rg_esc_char + "]", "g"), escape_char + "$&");
};
