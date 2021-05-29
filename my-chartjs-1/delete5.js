class BarController extends DatasetController {
    parsePrimitiveData(meta, data, start, count) {
      return parseArrayOrPrimitive(meta, data, start, count);
    }
    parseArrayData(meta, data, start, count) {
      return parseArrayOrPrimitive(meta, data, start, count);
    }
    parseObjectData(meta, data, start, count) {
      const {iScale, vScale} = meta;
      const {xAxisKey = 'x', yAxisKey = 'y'} = this._parsing;
      const iAxisKey = iScale.axis === 'x' ? xAxisKey : yAxisKey;
      const vAxisKey = vScale.axis === 'x' ? xAxisKey : yAxisKey;
      const parsed = [];
      let i, ilen, item, obj;
      for (i = start, ilen = start + count; i < ilen; ++i) {
        obj = data[i];
        item = {};
        item[iScale.axis] = iScale.parse(resolveObjectKey(obj, iAxisKey), i);
        parsed.push(parseValue(resolveObjectKey(obj, vAxisKey), item, vScale, i));
      }
      return parsed;
    }
    updateRangeFromParsed(range, scale, parsed, stack) {
      super.updateRangeFromParsed(range, scale, parsed, stack);
      const custom = parsed._custom;
      if (custom && scale === this._cachedMeta.vScale) {
        range.min = Math.min(range.min, custom.min);
        range.max = Math.max(range.max, custom.max);
      }
    }
    getLabelAndValue(index) {
      const me = this;
      const meta = me._cachedMeta;
      const {iScale, vScale} = meta;
      const parsed = me.getParsed(index);
      const custom = parsed._custom;
      const value = isFloatBar(custom)
        ? '[' + custom.start + ', ' + custom.end + ']'
        : '' + vScale.getLabelForValue(parsed[vScale.axis]);
      return {
        label: '' + iScale.getLabelForValue(parsed[iScale.axis]),
        value
      };
    }
    initialize() {
      const me = this;
      me.enableOptionSharing = true;
      super.initialize();
      const meta = me._cachedMeta;
      meta.stack = me.getDataset().stack;
    }
    update(mode) {
      const me = this;
      const meta = me._cachedMeta;
      me.updateElements(meta.data, 0, meta.data.length, mode);
    }
    updateElements(bars, start, count, mode) {
      const me = this;
      const reset = mode === 'reset';
      const vScale = me._cachedMeta.vScale;
      const base = vScale.getBasePixel();
      const horizontal = vScale.isHorizontal();
      const ruler = me._getRuler();
      const firstOpts = me.resolveDataElementOptions(start, mode);
      const sharedOptions = me.getSharedOptions(firstOpts);
      const includeOptions = me.includeOptions(mode, sharedOptions);
      me.updateSharedOptions(sharedOptions, mode, firstOpts);
      for (let i = start; i < start + count; i++) {
        const vpixels = reset ? {base, head: base} : me._calculateBarValuePixels(i);
        const ipixels = me._calculateBarIndexPixels(i, ruler);
        const properties = {
          horizontal,
          base: vpixels.base,
          x: horizontal ? vpixels.head : ipixels.center,
          y: horizontal ? ipixels.center : vpixels.head,
          height: horizontal ? ipixels.size : undefined,
          width: horizontal ? undefined : ipixels.size
        };
        if (includeOptions) {
          properties.options = sharedOptions || me.resolveDataElementOptions(i, mode);
        }
        me.updateElement(bars[i], i, properties, mode);
      }
    }
    _getStacks(last, dataIndex) {
      const me = this;
      const meta = me._cachedMeta;
      const iScale = meta.iScale;
      const metasets = iScale.getMatchingVisibleMetas(me._type);
      const stacked = iScale.options.stacked;
      const ilen = metasets.length;
      const stacks = [];
      let i, item;
      for (i = 0; i < ilen; ++i) {
        item = metasets[i];
        if (typeof dataIndex !== 'undefined') {
          const val = item.controller.getParsed(dataIndex)[
            item.controller._cachedMeta.vScale.axis
          ];
          if (isNullOrUndef(val) || isNaN(val)) {
            continue;
          }
        }
        if (stacked === false || stacks.indexOf(item.stack) === -1 ||
                  (stacked === undefined && item.stack === undefined)) {
          stacks.push(item.stack);
        }
        if (item.index === last) {
          break;
        }
      }
      if (!stacks.length) {
        stacks.push(undefined);
      }
      return stacks;
    }
    _getStackCount(index) {
      return this._getStacks(undefined, index).length;
    }
    _getStackIndex(datasetIndex, name) {
      const stacks = this._getStacks(datasetIndex);
      const index = (name !== undefined)
        ? stacks.indexOf(name)
        : -1;
      return (index === -1)
        ? stacks.length - 1
        : index;
    }
    _getRuler() {
      const me = this;
      const opts = me.options;
      const meta = me._cachedMeta;
      const iScale = meta.iScale;
      const pixels = [];
      let i, ilen;
      for (i = 0, ilen = meta.data.length; i < ilen; ++i) {
        pixels.push(iScale.getPixelForValue(me.getParsed(i)[iScale.axis], i));
      }
      const barThickness = opts.barThickness;
      const min = barThickness || computeMinSampleSize(iScale);
      return {
        min,
        pixels,
        start: iScale._startPixel,
        end: iScale._endPixel,
        stackCount: me._getStackCount(),
        scale: iScale,
        grouped: opts.grouped,
        ratio: barThickness ? 1 : opts.categoryPercentage * opts.barPercentage
      };
    }
    _calculateBarValuePixels(index) {
      const me = this;
      const {vScale, _stacked} = me._cachedMeta;
      const {base: baseValue, minBarLength} = me.options;
      const parsed = me.getParsed(index);
      const custom = parsed._custom;
      const floating = isFloatBar(custom);
      let value = parsed[vScale.axis];
      let start = 0;
      let length = _stacked ? me.applyStack(vScale, parsed, _stacked) : value;
      let head, size;
      if (length !== value) {
        start = length - value;
        length = value;
      }
      if (floating) {
        value = custom.barStart;
        length = custom.barEnd - custom.barStart;
        if (value !== 0 && sign(value) !== sign(custom.barEnd)) {
          start = 0;
        }
        start += value;
      }
      const startValue = !isNullOrUndef(baseValue) && !floating ? baseValue : start;
      let base = vScale.getPixelForValue(startValue);
      if (this.chart.getDataVisibility(index)) {
        head = vScale.getPixelForValue(start + length);
      } else {
        head = base;
      }
      size = head - base;
      if (minBarLength !== undefined && Math.abs(size) < minBarLength) {
        size = size < 0 ? -minBarLength : minBarLength;
        if (value === 0) {
          base -= size / 2;
        }
        head = base + size;
      }
      const actualBase = baseValue || 0;
      if (base === vScale.getPixelForValue(actualBase)) {
        const halfGrid = vScale.getLineWidthForValue(actualBase) / 2;
        if (size > 0) {
          base += halfGrid;
          size -= halfGrid;
        } else if (size < 0) {
          base -= halfGrid;
          size += halfGrid;
        }
      }
      return {
        size,
        base,
        head,
        center: head + size / 2
      };
    }
    _calculateBarIndexPixels(index, ruler) {
      const me = this;
      const scale = ruler.scale;
      const options = me.options;
      const maxBarThickness = valueOrDefault(options.maxBarThickness, Infinity);
      let center, size;
      if (ruler.grouped) {
        const stackCount = options.skipNull ? me._getStackCount(index) : ruler.stackCount;
        const range = options.barThickness === 'flex'
          ? computeFlexCategoryTraits(index, ruler, options, stackCount)
          : computeFitCategoryTraits(index, ruler, options, stackCount);
        const stackIndex = me._getStackIndex(me.index, me._cachedMeta.stack);
        center = range.start + (range.chunk * stackIndex) + (range.chunk / 2);
        size = Math.min(maxBarThickness, range.chunk * range.ratio);
      } else {
        center = scale.getPixelForValue(me.getParsed(index)[scale.axis], index);
        size = Math.min(maxBarThickness, ruler.min * ruler.ratio);
      }
      return {
        base: center - size / 2,
        head: center + size / 2,
        center,
        size
      };
    }
    draw() {
      const me = this;
      const chart = me.chart;
      const meta = me._cachedMeta;
      const vScale = meta.vScale;
      const rects = meta.data;
      const ilen = rects.length;
      let i = 0;
      clipArea(chart.ctx, chart.chartArea);
      for (; i < ilen; ++i) {
        if (me.getParsed(i)[vScale.axis] !== null) {
          rects[i].draw(me._ctx);
        }
      }
      unclipArea(chart.ctx);
    }
  }
  BarController.id = 'bar';
  BarController.defaults = {
    datasetElementType: false,
    dataElementType: 'bar',
    categoryPercentage: 0.8,
    barPercentage: 0.9,
    grouped: true,
    animations: {
      numbers: {
        type: 'number',
        properties: ['x', 'y', 'base', 'width', 'height']
      }
    }
  };
  BarController.overrides = {
    interaction: {
      mode: 'index'
    },
    scales: {
      _index_: {
        type: 'category',
        offset: true,
        grid: {
          offset: true
        }
      },
      _value_: {
        type: 'linear',
        beginAtZero: true,
      }
    }
  };