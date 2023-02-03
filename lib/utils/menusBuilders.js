import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SelectMenuBuilder } from 'discord.js';

export const buildButtonsMenu = (items, prefix) => {
  const rows = [];

  let row = new ActionRowBuilder();
  let rowCount = 0;
  items.forEach(item => {
    const button = new ButtonBuilder()
      .setCustomId(`${prefix}-${item.id}`)
      .setDisabled(item.disabled || false)
      .setLabel(item.label)
      .setStyle(item.style || ButtonStyle.Primary);

    if (rowCount === 5) {
      rows.push(row);
      row = new ActionRowBuilder();
      rowCount = 0;
    }

    if (item.emoji) {
      button.setEmoji(item.emoji);
    }
    if (item.url) {
      button.setURL(item.url);
    }

    rowCount++;
    row.addComponents(button);
  });

  if (rowCount > 0) {
    rows.push(row);
  }

  if (rows.length > 5) {
    // Too many rows !
    return buildSelectMenu(items, prefix);
  }

  return rows;
};

export const buildSelectMenu = (items, prefix, placeholder = 'Nothing selected', min = 1, max = 1) => {
  const rows = [];
  const row = new ActionRowBuilder();
  const menu = new SelectMenuBuilder()
    .setCustomId(prefix)
    .setPlaceholder(placeholder);

  if (max > 1) {
    menu.setMinValues(min).setMaxValues(max);
  }

  items.forEach(item => {
    menu.addOptions({
      label: item.label,
      description: item.description,
      value: item.id,
    });
  });

  row.addComponents(menu);
  rows.push(row);
  return rows;
};
